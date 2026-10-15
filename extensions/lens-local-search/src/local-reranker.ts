import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  statSync,
} from "node:fs";
import { basename, join } from "node:path";
import { createInterface } from "node:readline";
import type {
  Configuration,
  Hit,
  SearchResult,
  SearchService,
} from "./backend.ts";

export interface Evidence {
  id: string;
  text: string;
  image?: string;
}
export function scoreLocally(
  config: Configuration,
  query: string,
  candidates: Evidence[],
  signal: AbortSignal,
  subject?: { query: string; groups: string[][] },
): Promise<Record<string, number>> {
  if (signal.aborted) return Promise.reject(signal.reason);
  const focused = candidates.filter((candidate) =>
    subject?.groups.some((ids) => ids.includes(candidate.id)),
  );
  return new Promise((resolve, reject) => {
    const child = spawn(
      config.binary,
      [
        "rerank-service",
        ...config.roots,
        ...config.codeRoots,
        "--index",
        config.index,
        "--to",
        join(config.models, "reranker"),
      ],
      { signal, stdio: "pipe" },
    );
    child.stderr.resume();
    let bytes = 0,
      replies = 0,
      failure: Error | undefined,
      timedOut = false,
      focusSent = false;
    let scores: Record<string, number> | undefined;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 12_000);
    child.stdout.on("data", (data: Buffer) => {
      bytes += data.length;
      if (bytes > 32_768) {
        failure = new Error("Invalid relevance response");
        child.kill();
      }
    });
    const validate = (line: string, expected: Evidence[]) => {
      const values = JSON.parse(line).scores as Record<string, number>;
      if (
        !values ||
        Object.keys(values).length !== expected.length ||
        expected.some(
          ({ id }) =>
            !Object.hasOwn(values, id) ||
            !Number.isFinite(values[id]) ||
            values[id] < 0 ||
            values[id] > 1,
        )
      )
        throw new Error("Invalid relevance scores");
      return values;
    };
    createInterface({ input: child.stdout }).on("line", (line) => {
      replies++;
      try {
        if (replies === 1) {
          scores = validate(line, candidates);
          const best =
            subject?.groups
              .map((ids) => Math.max(...ids.map((id) => scores![id])))
              .sort((a, b) => b - a) ?? [];
          // shortcut: a clear within-query margin skips extra work; calibrate on a larger labelled set before tightening it.
          if (focused.length && (best.length < 2 || best[0] - best[1] < 0.15)) {
            focusSent = true;
            child.stdin.end(
              JSON.stringify({ query: subject!.query, candidates: focused }) +
                "\n",
            );
          } else child.stdin.end();
        } else if (replies === 2 && focusSent) {
          const focus = validate(line, focused);
          for (const { id } of focused)
            scores![id] = Math.sqrt(scores![id] * focus[id]);
        } else {
          failure = new Error("Invalid relevance response");
          child.kill();
        }
      } catch (error) {
        if (!scores) {
          failure =
            error instanceof Error
              ? error
              : new Error("Invalid relevance response");
          child.kill();
        }
        // An optional subject failure must retain verified full-query scores.
        child.stdin.end();
      }
    });
    child.stdin.on("error", (error) => {
      if (!scores) failure = error;
    });
    child.on("error", (error) => {
      failure = error;
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (
        failure ||
        signal.aborted ||
        !scores ||
        (code !== 0 && !timedOut && !focusSent)
      ) {
        reject(
          failure ??
            (signal.aborted
              ? signal.reason
              : new Error("Local relevance model unavailable")),
        );
        return;
      }
      resolve(scores);
    });
    child.stdin.write(JSON.stringify({ query, candidates }) + "\n");
  });
}

export async function rerankLocally(
  config: Configuration,
  service: SearchService,
  query: string,
  result: SearchResult,
  signal: AbortSignal,
): Promise<SearchResult> {
  const folder = join(config.models, "reranker");
  if (
    result.literal ||
    !result.meaning ||
    result.hits.length < 2 ||
    signal.aborted
  )
    return result;
  if (!existsSync(join(folder, "enabled.json")))
    return { ...result, rankingNotice: "Local ranking not set up" };
  // A bounded union, so a lexical or visual candidate survives an imperfect combined first-stage score.
  const supported = result.hits.filter((h) =>
    ["image", "screenshot", "pdf", "video", "doc", "code"].includes(h.kind),
  );
  const pool = new Set<Hit>(supported.slice(0, 6));
  supported
    .filter((h) => h.keyword_rank)
    .sort((a, b) => a.keyword_rank! - b.keyword_rank!)
    .slice(0, 1)
    .forEach((h) => pool.add(h));
  [...supported]
    .sort((a, b) => (b.z ?? 0) - (a.z ?? 0))
    .slice(0, 1)
    .forEach((h) => pool.add(h));
  const hits: Hit[] = [];
  try {
    const selected = [...pool].flatMap((hit) =>
      ["pdf", "doc"].includes(hit.kind) && hit.passages?.length
        ? hit.passages.map((passage) => ({ ...hit, ...passage }))
        : [hit],
    );
    const cachePath = join(config.index, "relevance-cache.json");
    type Entry = { indices: number[]; scores: Record<string, number> };
    let cache: Record<string, Entry> = {};
    try {
      const value: unknown = JSON.parse(readFileSync(cachePath, "utf8"));
      if (value && typeof value === "object" && !Array.isArray(value))
        cache = value as typeof cache;
    } catch {
      /* Missing/corrupt derived cache is disposable. */
    }
    const revision = readFileSync(join(folder, "enabled.json"), "utf8");
    const weights = [
      "Qwen3-VL-Reranker-2B.Q8_0.gguf",
      "Qwen3-VL-Reranker-2B.mmproj-q8_0.gguf",
      "Qwen3-VL-Reranker-2B.mmproj-f16.gguf",
    ].map((name) => {
      const file = statSync(join(folder, name), { throwIfNoEntry: false });
      return [name, file?.size, file?.mtimeMs];
    });
    // File/segment versions identify the same evidence without rendering or reading it again.
    const key = createHash("sha256")
      .update(
        JSON.stringify([
          "evidence-v6-document-subject-adaptive",
          revision,
          weights,
          query,
          result.plan?.semantic,
          result.plan?.subject,
          selected.map((h) => [
            h.path,
            h.modified,
            h.size,
            h.kind,
            h.segment,
            h.segment_id,
            h.loc,
            h.info.width,
            h.info.height,
            h.excerpt,
          ]),
        ]),
      )
      .digest("hex");
    const cached = cache[key];
    if (
      cached &&
      Array.isArray(cached.indices) &&
      cached.indices.length >= 2 &&
      new Set(cached.indices).size === cached.indices.length &&
      cached.indices.every(
        (i) => Number.isInteger(i) && i >= 0 && i < selected.length,
      ) &&
      cached.scores &&
      Object.keys(cached.scores).length === cached.indices.length &&
      cached.indices.every(
        (_, i) =>
          Number.isFinite(cached.scores[`r${i}`]) &&
          cached.scores[`r${i}`] >= 0 &&
          cached.scores[`r${i}`] <= 1,
      )
    ) {
      const hits = cached.indices.map((i) => selected[i]);
      return {
        ...result,
        hits: fuseRelevance(result, hits, cached.scores).map((r) => r.hit),
        reranked: new Set(hits.map((h) => h.path)).size,
      };
    }
    const candidates: Evidence[] = [],
      indices: number[] = [];
    for (let offset = 0; offset < selected.length; offset += 2) {
      signal.throwIfAborted();
      const prepared = await Promise.all(
        selected.slice(offset, offset + 2).map(async (hit) => {
          if (hit.segment === "name") return undefined;
          let text = "",
            context = "";
          if (["pdf", "doc", "code"].includes(hit.kind)) {
            const content = await service.request(
              {
                op: "text",
                segment: hit.segment_id,
                path: hit.path,
                modified: hit.modified,
                size: hit.size,
                segment_kind: hit.segment,
                loc: hit.loc ?? null,
                code: hit.kind === "code",
              },
              15_000,
              signal,
            );
            text =
              typeof content.text === "string"
                ? content.text
                : (hit.excerpt ?? "");
            context =
              typeof content.context === "string"
                ? content.context.slice(0, 700)
                : "";
          }
          // Text pages are read as text, with the matched passage rather than an arbitrary page prefix.
          if (text.trim() && hit.segment !== "page_image") {
            const passage = passageText(text, hit.excerpt);
            return {
              text:
                hit.kind === "code"
                  ? `${basename(hit.path).slice(0, 250)}\n${passage}`
                  : context && !text.startsWith(context)
                    ? `Document opening:\n${context}\nMatching passage:\n${passage.slice(0, 3400)}`
                    : passage,
            };
          }
          if (["image", "screenshot", "pdf", "video"].includes(hit.kind)) {
            const image = await service.request(
              {
                op: "render",
                path: hit.path,
                kind: hit.kind === "screenshot" ? "image" : hit.kind,
                loc: hit.loc,
                pixels: 768,
              },
              15_000,
              signal,
            );
            if (typeof image.image !== "string")
              throw new Error("Preview unavailable");
            return {
              text: text.trim()
                ? passageText(text, hit.excerpt)
                : `Image dimensions: ${hit.info.width ?? "unknown"} by ${hit.info.height ?? "unknown"} pixels.`,
              image: image.image,
            };
          }
          return undefined;
        }),
      );
      signal.throwIfAborted();
      prepared.forEach((evidence, i) => {
        if (!evidence) return;
        candidates.push({ id: `r${hits.length}`, ...evidence });
        hits.push(selected[offset + i]);
        indices.push(offset + i);
      });
    }
    if (hits.length < 2) return result;
    const semantic = result.plan?.semantic || query,
      subject = result.plan?.subject;
    const scores = await scoreLocally(
      config,
      semantic,
      candidates,
      signal,
      subject && subject !== semantic
        ? {
            query: subject,
            groups: [
              ...new Set(
                hits
                  .filter(
                    (hit, i) =>
                      ["pdf", "doc"].includes(hit.kind) && !candidates[i].image,
                  )
                  .map((hit) => hit.path),
              ),
            ].map((path) =>
              hits.flatMap((hit, i) =>
                hit.path === path && !candidates[i].image ? [`r${i}`] : [],
              ),
            ),
          }
        : undefined,
    );
    signal.throwIfAborted();
    delete cache[key];
    cache[key] = { indices, scores };
    const bounded = Object.fromEntries(Object.entries(cache).slice(-256));
    try {
      writeFileSync(cachePath + ".tmp", JSON.stringify(bounded), {
        mode: 0o600,
      });
      renameSync(cachePath + ".tmp", cachePath);
    } catch {
      /* Search works with a read-only cache. */
    }
    const ranked = fuseRelevance(result, hits, scores);
    return {
      ...result,
      hits: ranked.map((r) => r.hit),
      reranked: new Set(hits.map((h) => h.path)).size,
    };
  } catch {
    return signal.aborted
      ? result
      : {
          ...result,
          rankingNotice: "Local content ranking unavailable · Using similarity",
        };
  }
}

export function passageText(text: string, excerpt?: string) {
  const words = [...(excerpt ?? "").matchAll(/«([^«»]+)»/gu)].map((m) => m[1]);
  const at =
    words
      .map((word) => text.toLocaleLowerCase().indexOf(word.toLocaleLowerCase()))
      .find((at) => at >= 0) ?? 0;
  let start = Math.max(0, at - 700),
    end = Math.min(text.length, start + 4200);
  if (start > 0 && /[\uDC00-\uDFFF]/.test(text[start])) start--;
  if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
  return text.slice(start, end);
}

export function fuseRelevance(
  result: SearchResult,
  hits: Hit[],
  scores: Record<string, number>,
) {
  const top = Math.max(
    ...result.hits.map((hit) => result.localScores?.get(hit) ?? hit.score ?? 0),
    0.000001,
  );
  const judged = new Map<string, { hit: Hit; score: number }>();
  hits.forEach((hit, i) => {
    if (!judged.has(hit.path) || scores[`r${i}`] > judged.get(hit.path)!.score)
      judged.set(hit.path, { hit, score: scores[`r${i}`] });
  });
  // Uninspected files keep retrieval evidence, without borrowing a positive content score from inspected files.
  const neutral = judged.size
    ? Math.min(...[...judged.values()].map((entry) => entry.score))
    : 0;
  // Pointwise model scores are not calibrated probabilities; give independent retrieval equal weight.
  return result.hits
    .map((hit) => ({
      hit: judged.get(hit.path)?.hit ?? hit,
      value:
        (judged.get(hit.path)?.score ?? neutral) +
        Math.max(0, (result.localScores?.get(hit) ?? hit.score ?? 0) / top) +
        (result.mediumScores?.get(hit) ?? 0),
    }))
    .sort((a, b) => b.value - a.value);
}
