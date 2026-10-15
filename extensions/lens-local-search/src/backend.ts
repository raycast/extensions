import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { statSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { createInterface } from "node:readline";
import { describePlan, planMedium, type SearchPlan } from "./plan.ts";
import { filterScope } from "./scope.ts";
import { rerankLocally } from "./local-reranker.ts";
import { SearchFeedback } from "./feedback.ts";

export interface Configuration {
  binary: string;
  index: string;
  models: string;
  roots: string[];
  excluded: string[];
  types: string[];
  codeRoots: string[];
  codeExcluded: string[];
}

export interface Passage {
  segment: string;
  segment_id: number;
  loc?: number;
  excerpt?: string;
}

export interface Hit {
  path: string;
  kind: string;
  segment: string;
  segment_id: number;
  modified: number;
  size: number;
  score?: number;
  z?: number;
  keyword_rank?: number;
  loc?: number;
  focus?: number;
  excerpt?: string;
  info: Record<string, string>;
  passages?: Passage[];
}

export interface SearchResult {
  hits: Hit[];
  strong: number;
  meaning: boolean;
  literal?: boolean;
  localScores?: Map<Hit, number>;
  mediumScores?: Map<Hit, number>;
  queryDescription?: string;
  plan?: SearchPlan;
  reranked?: number;
  rankingNotice?: string;
}

type Reply = Record<string, unknown>;

function withinOneEdit(word: string, target: string) {
  let start = 0;
  while (start < word.length && word[start] === target[start]) start++;
  const a = word.slice(start),
    b = target.slice(start);
  return (
    a.slice(1) === b ||
    a === b.slice(1) ||
    a.slice(1) === b.slice(1) ||
    (a.length > 1 &&
      a[0] === b[1] &&
      a[1] === b[0] &&
      a.slice(2) === b.slice(2))
  );
}

export function resolveSearch(query: string, filter: string) {
  const text = query.trim();
  if (filter === "code" || /^code:/i.test(text))
    return { text: text.replace(/^code:\s*/i, "").trim(), kind: "code" };
  if (filter !== "auto") return { text, kind: filter };
  const image =
    /^(?:(?:find|show|get)(?:\s+me)?\s+)?(?:(?:an?|the|my|some)\s+)?([a-z]{4,12})\s+(?:of|with|showing)\s+(.+)$/i.exec(
      text,
    );
  const type =
    image &&
    [
      "image",
      "images",
      "photo",
      "photos",
      "picture",
      "pictures",
      "screenshot",
      "screenshots",
    ].find((word) => withinOneEdit(image[1].toLowerCase(), word));
  return image && type
    ? {
        text: image[2].trim(),
        kind: type.startsWith("screenshot") ? "screenshot" : "image",
      }
    : { text, kind: "all" };
}

export function configurationFromPreferences(
  prefs: Reply,
  assets: string,
  support: string,
): Configuration {
  const paths = (key: string): string[] => {
    const value = prefs[key] ?? [];
    if (
      !Array.isArray(value) ||
      value.some(
        (p) => typeof p !== "string" || p.includes("\0") || !isAbsolute(p),
      )
    ) {
      throw new Error(
        `Lens’s ${key} setting is invalid. Choose your folders again in Raycast.`,
      );
    }
    return value;
  };
  const directory = (key: string, fallback: string): string => {
    const value = prefs[key] ?? fallback;
    if (typeof value !== "string" || !isAbsolute(value))
      throw new Error(`Invalid Lens ${key} setting.`);
    return value;
  };
  const types = prefs.excludedTypes ?? [];
  if (!Array.isArray(types) || types.some((t) => typeof t !== "string"))
    throw new Error("Invalid excluded file types.");
  return {
    binary: join(assets, "digup"),
    index: directory("indexDir", join(support, "index")),
    models: directory("modelsDir", join(support, "models")),
    roots: paths("roots"),
    excluded: paths("excludedFolders"),
    types,
    codeRoots: paths("codeRoots"),
    codeExcluded: paths("codeExcludedFolders"),
  };
}

export function validateResults(reply: Reply): SearchResult {
  const hits = reply.hits;
  if (
    !Array.isArray(hits) ||
    typeof reply.meaning !== "boolean" ||
    !Number.isInteger(reply.strong) ||
    (reply.strong as number) < 0 ||
    (reply.strong as number) > hits.length
  ) {
    throw new Error(
      "Unexpected Lens search response. Check the backend version.",
    );
  }
  for (const hit of hits) {
    if (
      !hit ||
      typeof hit !== "object" ||
      typeof hit.path !== "string" ||
      !isAbsolute(hit.path) ||
      hit.path.includes("\0") ||
      typeof hit.kind !== "string" ||
      typeof hit.segment !== "string" ||
      !Number.isSafeInteger(hit.segment_id) ||
      !Number.isFinite(hit.modified) ||
      !Number.isFinite(hit.size) ||
      [hit.score, hit.z, hit.keyword_rank].some(
        (value) => value !== undefined && !Number.isFinite(value),
      ) ||
      (hit.loc !== undefined && !Number.isFinite(hit.loc)) ||
      (hit.focus !== undefined && !Number.isFinite(hit.focus)) ||
      (hit.excerpt !== undefined && typeof hit.excerpt !== "string") ||
      (hit.passages !== undefined &&
        (!Array.isArray(hit.passages) ||
          hit.passages.length > 2 ||
          hit.passages.some(
            (p: Passage) =>
              !p ||
              typeof p !== "object" ||
              !["page", "page_image", "chunk"].includes(p.segment) ||
              !Number.isSafeInteger(p.segment_id) ||
              (p.loc !== undefined && !Number.isFinite(p.loc)) ||
              (p.excerpt !== undefined && typeof p.excerpt !== "string"),
          ))) ||
      !hit.info ||
      typeof hit.info !== "object" ||
      Array.isArray(hit.info) ||
      Object.values(hit.info).some((value) => typeof value !== "string")
    ) {
      throw new Error("Lens returned an invalid file result.");
    }
  }
  const seen = new Set<string>();
  const unique = hits.filter((hit) => {
    if (seen.has(hit.path)) return false;
    seen.add(hit.path);
    return true;
  });
  const strongPaths = new Set(
    hits.slice(0, reply.strong as number).map((hit) => hit.path),
  );
  return {
    hits: unique,
    strong: unique.filter((hit) => strongPaths.has(hit.path)).length,
    meaning: reply.meaning,
  };
}

export class SearchService {
  readonly feedback: SearchFeedback;
  private child: ChildProcessWithoutNullStreams;
  private sequence = 0;
  private failure?: Error;
  private stamp = "";
  private pending = new Map<
    number,
    {
      resolve: (reply: Reply) => void;
      reject: (error: Error) => void;
      cleanup: () => void;
    }
  >();
  private config: Configuration;

  constructor(config: Configuration, catalog = false) {
    this.config = config;
    this.feedback = new SearchFeedback(config.index);
    const args = [
      "search-service",
      ...config.roots,
      "--index",
      config.index,
      "--encoder-idle",
      "60",
    ];
    if (catalog) args.push("--catalog");
    for (const root of config.excluded) args.push("--exclude", root);
    for (const root of config.codeRoots) args.push("--code-root", root);
    for (const root of config.codeExcluded) args.push("--code-exclude", root);
    for (const type of config.types) args.push("--exclude-ext", type);
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DIGUP_MODELS: config.models,
    };
    delete env.DIGUP_WORKER_DIR;
    this.child = spawn(config.binary, args, { env, stdio: "pipe" });
    this.child.stderr.resume();
    this.child.on("error", (error) => this.fail(error));
    this.child.stdin.on("error", (error) => this.fail(error));
    this.child.on("exit", () =>
      this.fail(
        new Error(
          "Lens’s search process stopped. Reopen the command to retry.",
        ),
      ),
    );
    createInterface({ input: this.child.stdout }).on("line", (line) => {
      let reply: Reply;
      try {
        reply = JSON.parse(line);
      } catch {
        return this.fail(new Error("Invalid response from Lens."));
      }
      if (!reply || typeof reply !== "object" || Array.isArray(reply))
        return this.fail(new Error("Invalid response from Lens."));
      if (typeof reply.id !== "number") return;
      const pending = this.pending.get(reply.id);
      if (!pending) return;
      this.pending.delete(reply.id);
      pending.cleanup();
      if (typeof reply.error === "string")
        pending.reject(new Error(reply.error));
      else pending.resolve(reply);
    });
  }

  request(
    request: Reply,
    timeout = 15_000,
    signal?: AbortSignal,
  ): Promise<Reply> {
    if (signal?.aborted) return Promise.reject(signal.reason);
    if (this.failure) return Promise.reject(this.failure);
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          this.fail(
            new Error(
              "Lens took too long to respond. Reopen the command to retry.",
            ),
          ),
        timeout,
      );
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", cancel);
      };
      const cancel = () => {
        this.pending.delete(id);
        cleanup();
        reject(signal!.reason);
      };
      signal?.addEventListener("abort", cancel, { once: true });
      this.pending.set(id, { resolve, reject, cleanup });
      this.child.stdin.write(JSON.stringify({ ...request, id }) + "\n");
    });
  }

  async search(
    query: string,
    kind: string,
    plan?: SearchPlan,
    meaning = true,
    signal?: AbortSignal,
  ): Promise<SearchResult> {
    const send = (request: Reply) => this.request(request, 15_000, signal);
    signal?.throwIfAborted();
    const scope = resolveSearch(query, kind);
    if (kind === "auto") scope.kind = planMedium(plan?.filter) ?? scope.kind;
    const code = scope.kind === "code";
    if (
      !(
        code
          ? this.config.codeRoots
          : [
              ...this.config.roots,
              ...(scope.kind === "all" ? this.config.codeRoots : []),
            ]
      ).length
    )
      return { hits: [], strong: 0, meaning: false };
    const text = scope.text;
    if (!text) return { hits: [], strong: 0, meaning: false };
    const stamp = [
      "index.sqlite",
      "code.sqlite",
      "index.sqlite-wal",
      "code.sqlite-wal",
    ]
      .map((file) => {
        const path = join(this.config.index, file);
        return statSync(path, { throwIfNoEntry: false })?.mtimeMs ?? 0;
      })
      .join(":");
    if (stamp !== this.stamp) {
      await send({ op: "reload" });
      this.stamp = stamp;
    }
    const kinds =
      scope.kind === "documents"
        ? ["pdf", "doc"]
        : scope.kind === "image"
          ? ["image", "screenshot"]
          : scope.kind === "all" || code
            ? undefined
            : [scope.kind];
    const description = plan ? describePlan(plan) : undefined;
    if (plan?.filter && !plan.semantic) {
      const lanes = code
        ? [true]
        : scope.kind === "all" && this.config.codeRoots.length
          ? [false, true]
          : [false];
      const matches = new Map<string, Hit>();
      for (const lane of lanes) {
        if (!(lane ? this.config.codeRoots : this.config.roots).length)
          continue;
        let after: { modified: number; path: string } | undefined;
        while (matches.size < 200) {
          const page = validateResults(
            await send({
              op: "files",
              code: lane,
              kinds,
              filter: plan.filter,
              limit: 200,
              after,
            }),
          );
          for (const hit of filterScope(this.config, page).hits) {
            if (!kinds || kinds.includes(hit.kind)) matches.set(hit.path, hit);
            if (matches.size >= 200) break;
          }
          if (page.hits.length < 200) break;
          const last = page.hits.at(-1)!;
          if (
            after &&
            last.path === after.path &&
            last.modified === after.modified
          )
            throw new Error(
              "Lens’s engine needs an update. Reinstall the extension.",
            );
          after = { modified: last.modified, path: last.path };
        }
      }
      const hits = [...matches.values()];
      return {
        hits,
        strong: hits.length,
        meaning: false,
        literal: true,
        plan,
        queryDescription: description,
      };
    }
    if (meaning) await send({ op: "prewarm" });
    const request = {
      op: "search",
      q: plan?.semantic || text,
      code,
      kinds,
      filter: plan?.filter,
      focus_q: plan?.subject,
      limit: meaning ? 160 : 40,
      candidate_pool: meaning,
      meaning,
      prefix_last: !meaning,
    };
    let result =
      this.config.roots.length || code
        ? validateResults(await send(request))
        : ({ hits: [], strong: 0, meaning: false } as SearchResult);
    if (scope.kind === "all" && this.config.codeRoots.length) {
      const other = validateResults(await send({ ...request, code: true }));
      const byPath = new Map<string, { hit: Hit; rank: number }>();
      for (const lane of [result, other])
        lane.hits.forEach((hit, i) => {
          const old = byPath.get(hit.path);
          const rank = 1 / (60 + i + 1);
          if (old) old.rank += rank;
          else byPath.set(hit.path, { hit, rank });
        });
      const strong = new Set(
        [
          ...result.hits.slice(0, result.strong),
          ...other.hits.slice(0, other.strong),
        ].map((h) => h.path),
      );
      const topRank = Math.max(
        ...[...byPath.values()].map((v) => v.rank),
        0.000001,
      );
      result = {
        hits: [...byPath.values()]
          .sort(
            (a, b) =>
              Number(strong.has(b.hit.path)) - Number(strong.has(a.hit.path)) ||
              b.rank - a.rank,
          )
          .map(({ hit }) => hit),
        strong: strong.size,
        meaning: result.meaning || other.meaning,
        localScores: new Map(
          [...byPath.values()].map(({ hit, rank }) => [hit, rank / topRank]),
        ),
      };
    }
    return {
      ...filterScope(this.config, result),
      plan,
      queryDescription: description,
    };
  }

  rerank(query: string, result: SearchResult, signal: AbortSignal) {
    return rerankLocally(this.config, this, query, result, signal);
  }

  close() {
    this.fail(new Error("Search closed."));
  }

  private fail(error: Error) {
    if (this.failure) return;
    this.failure = error;
    for (const pending of this.pending.values()) {
      pending.cleanup();
      pending.reject(error);
    }
    this.pending.clear();
    this.child.kill();
  }
}
