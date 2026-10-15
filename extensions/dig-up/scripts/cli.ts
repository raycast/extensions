// Dig Up's developer CLI over the engine modules, without the daemon (DigUp: Sources/digup/main.swift). Every command
// works on an explicit index folder, so a run never touches Raycast's own. Output matches DigUp's `digup` so the two
// diff cleanly.
//
//   bash scripts/run-node.sh scripts/cli.ts index <folder>... [--code] [--index DIR] [--limit N] [--reindex]
//   bash scripts/run-node.sh scripts/cli.ts search <words>... [--index DIR] [--kind K,K] [-n 10] [--json]
//   bash scripts/run-node.sh scripts/cli.ts status [--code] [--index DIR]
//   bash scripts/run-node.sh scripts/cli.ts eval <queries.json> [-n 10] [--index DIR] [--zgate Z] [--word-weight W]
//   bash scripts/run-node.sh scripts/cli.ts estimate <folder>... [--code] [--index DIR]
//
// Options: --exclude DIR, --exclude-ext EXT (repeatable), --llama PATH (llama-server), --models DIR. The model files
// are looked for where Dig Up looks (DIGUP_MODELS or --models only, when given); llama-server is the vendored build
// (.vendor/llama-b11624), DIGUP_LLAMA_SERVER or --llama. llama-server listens on a port in 18900-18999.

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { crawl } from "../engine/crawler";
import { EmbedderManager, type Embedder } from "../engine/embedder";
import { estimatesBySubfolder, addEstimates, emptyEstimate, lookUpFacts, MeasuredCosts } from "../engine/estimator";
import { Helper, mtmdBeside } from "../engine/helper";
import { Indexer, type IndexEvent, type StepEvent } from "../engine/indexer";
import { findLlama, findModels, formatBytes, LLAMA_BUILD } from "../engine/install";
import { fileLog, type Log } from "../engine/log";
import { makePaths } from "../engine/paths";
import { lastPathComponent, parentPath, parseExtensions } from "../engine/rules";
import { Searcher } from "../engine/searcher";
import { graphemeCount } from "../engine/searchtext";
import { Store } from "../engine/store";
import {
  DEFAULT_OPTIONS,
  FILE_KINDS,
  Prompts,
  codeQueryText,
  strongCount,
  type FileKind,
  VECTOR_SOURCE,
  type Hit,
  type IndexOptions,
} from "../engine/types";

const ROOT = resolve(__dirname, "..");
const PORTS: [number, number] = [18900, 18999];

class CLIError extends Error {}

// ---------------------------------------------------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------------------------------------------------

const VALUED = new Set(["--index", "--limit", "--kind", "-n", "--zgate", "--word-weight", "--llama", "--models"]);
const REPEATED = new Set(["--exclude", "--exclude-ext"]);

export class Arguments {
  positional: string[] = [];
  values = new Map<string, string>();
  lists = new Map<string, string[]>();
  flags = new Set<string>();

  constructor(raw: string[]) {
    for (let index = 0; index < raw.length; index++) {
      const argument = raw[index];
      if (VALUED.has(argument) || REPEATED.has(argument)) {
        if (index + 1 >= raw.length) throw new CLIError(`${argument} needs a value`);
        const value = raw[++index];
        if (REPEATED.has(argument)) this.lists.set(argument, [...(this.lists.get(argument) ?? []), value]);
        else this.values.set(argument, value);
      } else if (argument.startsWith("--") || argument === "-h") {
        this.flags.add(argument);
      } else {
        this.positional.push(argument);
      }
    }
  }

  get code(): boolean {
    return this.flags.has("--code");
  }

  get indexFolder(): string {
    const chosen = this.values.get("--index");
    if (!chosen) throw new CLIError("which index? pass --index DIR (the CLI never uses Raycast's own index)");
    return folderPath(chosen);
  }

  get options(): IndexOptions {
    return {
      ...DEFAULT_OPTIONS,
      code: this.code,
      excludedFolders: (this.lists.get("--exclude") ?? []).map(folderPath),
      excludedExtensions: parseExtensions((this.lists.get("--exclude-ext") ?? []).join(",")),
    };
  }

  get zGate(): number {
    return Number(this.values.get("--zgate") ?? 2.0);
  }

  get wordWeight(): number | undefined {
    const value = this.values.get("--word-weight");
    return value === undefined ? undefined : Number(value);
  }

  kinds(): FileKind[] | null {
    const list = this.values.get("--kind");
    if (list === undefined) return null;
    return list.split(",").map((name) => {
      const kind = name.trim() as FileKind;
      if (!FILE_KINDS.includes(kind) || kind === "code") {
        throw new CLIError(`unknown kind ${name}; use screenshot, image, pdf, doc, audio, video`);
      }
      return kind;
    });
  }

  folders(): string[] {
    if (this.positional.length === 0) throw new CLIError("which folders? e.g. cli.ts index ~/DigUpTestbed --index DIR");
    return this.positional.map((given) => {
      const path = folderPath(given);
      if (!isFolder(path)) throw new CLIError(`not a folder: ${given}`);
      if (!isReadable(path)) throw new CLIError(`can't read ${given} (macOS privacy settings?)`);
      return path;
    });
  }
}

/** `~` expanded and standardized, as DigUp's `folderURL`. */
function folderPath(path: string): string {
  return resolve(path === "~" ? homedir() : path.startsWith("~/") ? join(homedir(), path.slice(2)) : path);
}

function isFolder(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isReadable(path: string): boolean {
  try {
    readdirSync(path);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Formatting (DigUp's)
// ---------------------------------------------------------------------------------------------------------------------

const HOME = homedir();
const tilde = (path: string) => (path.startsWith(HOME) ? "~" + path.slice(HOME.length) : path);
const pad = (text: string, width: number) => {
  const count = graphemeCount(text);
  return count >= width ? text : text + " ".repeat(width - count);
};
const lpad = (text: string, width: number) => {
  const count = graphemeCount(text);
  return count >= width ? text : " ".repeat(width - count) + text;
};
const number = (value: number) => value.toLocaleString("en-US");

/** printf's `%.<digits>f`: the exact binary value rounded, a tie to even (JavaScript's toFixed rounds a tie up). */
export function fixed(value: number, digits: number): string {
  if (!Number.isFinite(value)) return String(value);
  const exact = Math.abs(value).toFixed(Math.min(100, digits + 60));
  const [whole, fraction] = exact.split(".");
  const kept = fraction.slice(0, digits);
  const rest = fraction.slice(digits);
  let digitsText = whole + kept;
  const tie = /^50*$/.test(rest);
  const up = rest[0] > "5" || (rest[0] === "5" && !tie) || (tie && Number(digitsText[digitsText.length - 1]) % 2 === 1);
  if (up) {
    const raised = (BigInt(digitsText) + 1n).toString().padStart(digitsText.length, "0");
    digitsText = raised;
  }
  const integer = digitsText.slice(0, digitsText.length - digits) || "0";
  const text = digits > 0 ? `${integer}.${digitsText.slice(digitsText.length - digits)}` : integer;
  return (value < 0 && /[1-9]/.test(text) ? "-" : "") + text;
}

const padFixed = (value: number, width: number, digits: number) => lpad(fixed(value, digits), width);

function duration(seconds: number): string {
  if (seconds < 90) return `${Math.round(seconds)} s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`;
  return `${fixed(seconds / 3600, 1)} h`;
}

function clock(seconds: number): string {
  const total = Math.trunc(seconds);
  const two = (n: number) => String(n).padStart(2, "0");
  return total >= 3600
    ? `${Math.trunc(total / 3600)}:${two(Math.trunc(total / 60) % 60)}:${two(total % 60)}`
    : `${Math.trunc(total / 60)}:${two(total % 60)}`;
}

/** DigUp's `location(hit)`: where in the file a hit is. */
export function location(hit: Hit): string {
  const loc = hit.loc;
  switch (hit.segment) {
    case "page":
    case "page_image":
      return loc === null ? "" : `p. ${Math.trunc(loc)}`;
    case "audio":
    case "frame":
      return loc === null ? "" : `at ${clock(loc)}` + (hit.segment === "audio" ? " (sound)" : "");
    case "chunk":
      return loc === null ? "" : `part ${Math.trunc(loc)}`;
    case "lines":
      return loc === null
        ? ""
        : `lines ${Math.trunc(loc)}–${Math.trunc(hit.locEnd ?? loc)}` +
            (hit.focus !== null ? `, opens at ${Math.trunc(hit.focus)}` : "");
    case "cells":
      return loc === null
        ? ""
        : loc === hit.locEnd
          ? `cell ${Math.trunc(loc)}`
          : `cells ${Math.trunc(loc)}–${Math.trunc(hit.locEnd ?? loc)}`;
    case "ocr":
      return "text in image";
    default:
      return "";
  }
}

const statesLine = (states: Partial<Record<string, number>>) =>
  Object.keys(states)
    .sort()
    .map((key) => `${states[key]} ${key}`)
    .join(" · ");

const skippedLine = (skipped: Record<string, number>) =>
  Object.entries(skipped)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([reason, count]) => `${number(count)} ${reason}`)
    .join(" · ");

// ---------------------------------------------------------------------------------------------------------------------
// The engine's parts
// ---------------------------------------------------------------------------------------------------------------------

interface Runtime {
  helper: Helper;
  manager: EmbedderManager | null;
  log: Log;
  close(): Promise<void>;
}

function llamaServer(args: Arguments): string {
  const given = args.values.get("--llama") ?? process.env.DIGUP_LLAMA_SERVER;
  if (given) return folderPath(given);
  const vendored = join(ROOT, ".vendor", `llama-b${LLAMA_BUILD}`, "llama-server");
  if (existsSync(vendored)) return vendored;
  const found = findLlama(makePaths(join(tmpdir(), "dig-up-cli"), join(ROOT, "assets")), null);
  if (found.bin === null) throw new CLIError(`no llama-server: ${found.reason}`);
  return found.bin;
}

function modelFiles(args: Arguments): { text: string; media: string | null } {
  const override = args.values.get("--models") ?? process.env.DIGUP_MODELS ?? null;
  const found = findModels(
    makePaths(join(tmpdir(), "dig-up-cli"), join(ROOT, "assets")),
    override && folderPath(override),
  );
  if (found.text === null) throw new CLIError(`no model: ${found.reason}`);
  return { text: found.text, media: found.media };
}

/** The helper (decoding pictures with llama.cpp's own decoder, as DigUp's embedder does) and, when asked, the
 *  embedder. Both end with `close()`, also on Ctrl-C. */
function runtime(args: Arguments, folder: string, o: { model: boolean }): Runtime {
  const log = fileLog(join(folder, "cli.log"));
  const server = o.model ? llamaServer(args) : null;
  const helper = new Helper(join(ROOT, "assets", "digup-helper"), log, {
    mtmdLibrary: server ? mtmdBeside(server) : null,
  });
  let manager: EmbedderManager | null = null;
  if (server) {
    const models = modelFiles(args);
    manager = new EmbedderManager({
      serverBin: server,
      textModel: models.text,
      mediaModel: models.media ?? "",
      logs: folder,
      log,
      portRange: PORTS,
    });
  }
  let closing: Promise<void> | null = null;
  const close = () =>
    (closing ??= (async () => {
      await manager?.stop();
      await helper.close();
    })());
  process.once("SIGINT", () => {
    void close().then(() => process.exit(130));
  });
  return { helper, manager, log, close };
}

// ---------------------------------------------------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------------------------------------------------

function storePath(folder: string, code: boolean): string {
  return join(folder, code ? "code.sqlite" : "index.sqlite");
}

async function index(args: Arguments): Promise<void> {
  const folder = args.indexFolder;
  const folders = args.folders();
  mkdirSync(folder, { recursive: true });
  const store = Store.open(storePath(folder, args.code), { code: args.code });
  const parts = runtime(args, folder, { model: true });
  const scratch = join(tmpdir(), `DigUpRaycast-${process.pid}`, randomUUID());
  try {
    if (args.flags.has("--reindex")) store.resetAll();
    const manager = parts.manager!;
    const indexer = new Indexer({
      store,
      options: args.options,
      helper: parts.helper,
      embedder: () => manager.index(),
      scratch,
      costsFolder: folder,
      log: parts.log,
    });
    store.readAgainOnce({ ocr: true, drawsVectorPictures: true });
    indexer.checkModel();
    const sync = await indexer.sync(folders);
    console.log(`index: ${tilde(store.file)}`);
    console.log(
      `sync: ${sync.added} new · ${sync.changed} changed · ${sync.moved} moved · ${sync.removed} removed · ${sync.unchanged} unchanged`,
    );
    if (Object.keys(sync.crawl.skipped).length > 0) console.log("skipped: " + skippedLine(sync.crawl.skipped));
    for (const [dataset, count] of Object.entries(sync.crawl.datasets)) {
      console.log(`looks like a dataset (skipped): ${tilde(dataset)} (${number(count)} files)`);
    }
    const limit = args.values.has("--limit") ? Number(args.values.get("--limit")) : null;
    let started = performance.now();
    const states = await indexer.run({
      limit,
      onEvent: (event: IndexEvent) => {
        const note = event.note ? `  (${event.note})` : "";
        console.log(
          `[${lpad(`${event.done}`, 4)}/${event.total}] ${pad(event.kind, 10)} ${pad(event.state, 7)} ` +
            `${padFixed(event.seconds, 5, 2)}s  ${lastPathComponent(event.path)}${note}`,
        );
      },
    });
    if (Object.keys(states).length === 0) console.log("nothing pending");
    else console.log(`done in ${duration((performance.now() - started) / 1000)}: ${statesLine(states)}`);
    // The rest of long files, as the app does once nothing is pending (not after a --limit run).
    if (limit === null && store.unfinishedCount().files > 0) {
      started = performance.now();
      const finished = await indexer.finishLongFiles({
        onStep: (step: StepEvent) => {
          const note = step.note ? `  (${step.note})` : "";
          console.log(
            `[rest ${lpad(`${step.done}`, 5)}/${step.total}] ${pad(step.kind, 4)} ${pad(step.state, 7)} ` +
              `${padFixed(step.seconds, 5, 2)}s  ${lastPathComponent(step.path)}${note}`,
          );
        },
      });
      console.log(
        `the rest of long files in ${duration((performance.now() - started) / 1000)}: ` +
          (Object.keys(finished).length === 0 ? "none finished" : statesLine(finished)),
      );
    }
    indexer.finish();
  } finally {
    store.close();
    await parts.close();
  }
}

function status(args: Arguments): void {
  const folder = args.indexFolder;
  const file = storePath(folder, args.code);
  if (!existsSync(file)) throw new CLIError(`no index at ${tilde(file)}`);
  const store = Store.open(file, { code: args.code });
  try {
    const counts = store.counts();
    console.log(`index: ${tilde(store.file)}`);
    console.log(`vectors: ${number(counts.vectors)} in ${number(counts.segments)} segments`);
    for (const kind of FILE_KINDS) {
      const states = counts.byKindAndState[kind];
      if (!states) continue;
      const total = Object.values(states).reduce((sum, n) => sum + n, 0);
      console.log(`  ${pad(kind, 11)} ${lpad(number(total), 6)}   ${statesLine(states)}`);
    }
    if (counts.unfinished > 0) {
      console.log(
        `long files still being read: ${number(counts.unfinished)} (${number(counts.left)} pages and chunks left)`,
      );
    }
    const fingerprint = store.meta("fingerprint");
    if (fingerprint) console.log(`built with: ${fingerprint}`);
    console.log(`this dig up: llama.cpp b${LLAMA_BUILD}, vectors 1`);
    console.log(`size: ${formatBytes(Store.size(store.file))}`);
  } finally {
    store.close();
  }
}

/** Query vectors from the text-only server, with the search's prompt; null when the index has no vectors. */
async function queryVectors(
  queries: string[],
  searcher: Searcher,
  embedder: () => Promise<Embedder>,
  prompt: (text: string) => string,
): Promise<Float32Array[] | null> {
  if (searcher.vectorCount === 0 || queries.length === 0) return null;
  if (searcher.vectorSource !== null && searcher.vectorSource !== VECTOR_SOURCE) {
    throw new CLIError(`index vectors come from ${searcher.vectorSource} but the query encoder is ${VECTOR_SOURCE}`);
  }
  const worker = await embedder();
  return worker.embedTexts(queries.map(prompt));
}

async function search(args: Arguments): Promise<void> {
  let query = args.positional.join(" ");
  if (query.trim() === "") throw new CLIError("search for what?");
  const code = codeQueryText(query);
  if (code !== null) query = code;
  if (query === "") throw new CLIError("search the code for what?");
  const folder = args.indexFolder;
  const store = Store.open(storePath(folder, code !== null), { code: code !== null });
  const parts = runtime(args, folder, { model: true });
  try {
    const searcher = new Searcher(store);
    const started = performance.now();
    const vectors = await queryVectors(
      [query],
      searcher,
      () => parts.manager!.query(),
      code !== null ? Prompts.codeQuery : Prompts.query,
    );
    const encoded = performance.now();
    const hits = searcher.search(query, vectors === null ? null : vectors[0], {
      kinds: args.kinds(),
      limit: Number(args.values.get("-n") ?? 10),
      zGate: args.zGate,
      wordWeight: args.wordWeight,
    });
    const searched = performance.now();
    if (args.flags.has("--json")) {
      console.log(JSON.stringify(hits.map(hitFields), null, 2));
      return;
    }
    if (hits.length === 0) console.log("no good matches");
    hits.forEach((hit, rank) => {
      const why = [
        hit.z === null ? null : `z ${fixed(hit.z, 1)}`,
        hit.keywordRank === null ? null : `words #${hit.keywordRank}`,
      ]
        .filter((part) => part !== null)
        .join(", ");
      const place = location(hit);
      console.log(
        `${lpad(`${rank + 1}`, 2)}. ${pad(hit.kind, 10)} ${lastPathComponent(hit.path)}` +
          (place === "" ? "" : `  [${place}]`) +
          `   (${why})`,
      );
      console.log(`      ${tilde(parentPath(hit.path))}`);
      if (hit.excerpt) console.log(`      “${[...hit.excerpt].slice(0, 160).join("")}”`);
    });
    console.log(
      `(${searcher.vectorCount} vectors · query encoder ${fixed((encoded - started) / 1000, 2)} s incl. start-up · ` +
        `search ${fixed(searched - encoded, 0)} ms)`,
    );
  } finally {
    store.close();
    await parts.close();
  }
}

/** DigUp's `hitFields`: the JSON of a hit, with keys sorted. */
function hitFields(hit: Hit): Record<string, unknown> {
  const row: Record<string, unknown> = {
    path: hit.path,
    kind: hit.kind,
    segment: hit.segment,
    segment_id: hit.segmentId,
    score: hit.score,
    modified: hit.modified,
    size: hit.size,
    info: hit.info,
  };
  if (hit.z !== null) row.z = hit.z;
  if (hit.cosine !== null) row.cosine = hit.cosine;
  if (hit.keywordRank !== null) row.keyword_rank = hit.keywordRank;
  if (hit.loc !== null) row.loc = hit.loc;
  if (hit.locEnd !== null) row.loc_end = hit.locEnd;
  if (hit.focus !== null) row.focus = hit.focus;
  if (hit.excerpt !== null) row.excerpt = hit.excerpt;
  return Object.fromEntries(
    Object.keys(row)
      .sort()
      .map((key) => [key, row[key]]),
  );
}

interface EvalFile {
  base: string;
  queries: Array<{ q: string; expect: string[]; tag?: string; kind?: string }>;
}

interface EvalRow {
  n: number;
  at1: number;
  at5: number;
  at10: number;
  mrr: number;
}

/** A place a hit must be at: a page or moment starts in the range; a stretch of code overlaps it. */
function at(hit: Hit, range: [number, number]): boolean {
  if (hit.loc === null) return false;
  if (hit.segment === "lines" || hit.segment === "cells")
    return hit.loc <= range[1] && (hit.locEnd ?? hit.loc) >= range[0];
  return hit.loc >= range[0] && hit.loc <= range[1];
}

/** Recall of known answers, printed as `digup eval` prints it. Returns the per-tag table too (for tests). */
export async function evaluate(
  args: Arguments,
  print: (line: string) => void = console.log,
): Promise<Map<string, EvalRow>> {
  const file = args.positional[0];
  if (!file) throw new CLIError("which eval file?");
  const evalFile = JSON.parse(readFileSync(folderPath(file), "utf8")) as EvalFile;
  let base =
    evalFile.base === "~" ? HOME : evalFile.base.startsWith("~/") ? join(HOME, evalFile.base.slice(2)) : evalFile.base;
  // The testbed kept elsewhere: DIGUP_TESTBED stands for ~/DigUpTestbed in the eval's base.
  const testbed = process.env.DIGUP_TESTBED;
  if (testbed && evalFile.base.startsWith("~/DigUpTestbed"))
    base = testbed + evalFile.base.slice("~/DigUpTestbed".length);
  const isCode = evalFile.queries.map((query) => codeQueryText(query.q) !== null);
  const texts = evalFile.queries.map((query) => codeQueryText(query.q) ?? query.q);
  const folder = args.indexFolder;
  const parts = runtime(args, folder, { model: true });
  const stores: Store[] = [];
  try {
    const searchers = new Map<boolean, Searcher>();
    const vectors: Array<Float32Array | null> = texts.map(() => null);
    for (const code of new Set(isCode)) {
      const store = Store.open(storePath(folder, code), { code });
      stores.push(store);
      const searcher = new Searcher(store);
      searchers.set(code, searcher);
      const indices = texts.flatMap((_, at) => (isCode[at] === code ? [at] : []));
      const embedded = await queryVectors(
        indices.map((at) => texts[at]),
        searcher,
        () => parts.manager!.query(),
        code ? Prompts.codeQuery : Prompts.query,
      );
      indices.forEach((at, position) => (vectors[at] = embedded?.[position] ?? null));
    }
    const depth = Number(args.values.get("-n") ?? 10);
    const byTag = new Map<string, EvalRow>();
    let shown = 0;
    let listed = 0;
    let folded = 0;
    evalFile.queries.forEach((query, index) => {
      const kinds = query.kind && FILE_KINDS.includes(query.kind as FileKind) ? [query.kind as FileKind] : null;
      const hits = searchers.get(isCode[index])!.search(texts[index], vectors[index], {
        kinds,
        limit: depth,
        zGate: args.zGate,
        wordWeight: args.wordWeight,
      });
      const strong = strongCount(hits.map((hit) => hit.score));
      shown += strong;
      listed += hits.length;
      const targets = query.expect.map((entry) => {
        const split = entry.indexOf("@");
        const path = split < 0 ? entry : entry.slice(0, split);
        const bounds =
          split < 0
            ? []
            : entry
                .slice(split + 1)
                .split("-")
                .map(Number)
                .filter((n) => !Number.isNaN(n));
        return {
          path: `${base}/${path}`,
          range: bounds.length === 2 ? ([bounds[0], bounds[1]] as [number, number]) : null,
        };
      });
      const found = hits.findIndex((hit) =>
        targets.some((target) => hit.path === target.path && (target.range === null || at(hit, target.range))),
      );
      const rank = found < 0 ? null : found + 1;
      if (rank !== null && rank > strong) folded++;
      const tag = query.tag ?? "all";
      for (const key of new Set([tag, "ALL"])) {
        const row = byTag.get(key) ?? { n: 0, at1: 0, at5: 0, at10: 0, mrr: 0 };
        row.n++;
        if (rank !== null) {
          if (rank <= 1) row.at1++;
          if (rank <= 5) row.at5++;
          if (rank <= 10) row.at10++;
          row.mrr += 1 / rank;
        }
        byTag.set(key, row);
      }
      const top = hits[0];
      const topText = top ? lastPathComponent(top.path) + (location(top) === "" ? "" : ` [${location(top)}]`) : "-";
      print(
        `${rank === null ? "miss" : lpad(`#${rank}`, 4)}  ${pad(tag, 11)} ${pad(`“${query.q}”`, 42)} top: ${topText}`,
      );
    });
    print("");
    print(
      `${pad("tag", 12)} ${lpad("n", 3)}  ${lpad("R@1", 5)}  ${lpad("R@5", 5)}  ${lpad("R@10", 5)}  ${lpad("MRR", 5)}`,
    );
    const sortKey = (tag: string) => (tag === "ALL" ? "~" : tag);
    for (const [tag, row] of [...byTag].sort((a, b) => (sortKey(a[0]) < sortKey(b[0]) ? -1 : 1))) {
      const n = row.n;
      print(
        `${pad(tag, 12)} ${lpad(`${row.n}`, 3)}  ` +
          [row.at1 / n, row.at5 / n, row.at10 / n, row.mrr / n].map((value) => padFixed(value, 5, 2)).join("  "),
      );
    }
    const count = Math.max(1, evalFile.queries.length);
    print(
      `weaker-matches fold (below 0.5× the top score): ${fixed(shown / count, 1)} of ${fixed(listed / count, 1)} ` +
        `results shown per query; ${folded} expected ${folded === 1 ? "answer" : "answers"} folded`,
    );
    return byTag;
  } finally {
    for (const store of stores) store.close();
    await parts.close();
  }
}

async function estimateCommand(args: Arguments): Promise<void> {
  const folder = args.indexFolder;
  const options = args.options;
  const costs = MeasuredCosts.load(folder).costs;
  const parts = runtime(args, folder, { model: false });
  try {
    let total = 0;
    for (const root of args.folders()) {
      const started = performance.now();
      const report = await crawl([root], options, { helper: parts.helper });
      const facts = await lookUpFacts(report.candidates, parts.helper);
      const groups = estimatesBySubfolder(report.candidates, root, options, costs, facts);
      const sum = [...groups.values()].reduce(addEstimates, emptyEstimate());
      total += sum.seconds;
      const kinds: string[] = [];
      for (const kind of FILE_KINDS) {
        const count = sum.files[kind] ?? 0;
        if (count === 0) continue;
        if (kind === "pdf") {
          kinds.push(
            `${number(count)} PDFs (${number(sum.pdfPagesTotal)} pages; ${number(sum.pdfPages)} in the first pass)`,
          );
        } else if (kind === "code") {
          kinds.push(
            `${number(count)} code ${count === 1 ? "file" : "files"} (${number(sum.codeStretches)} stretches)`,
          );
        } else {
          kinds.push(`${number(count)} ${kind}${count === 1 ? "" : "s"}`);
        }
      }
      console.log(
        `${tilde(root)}    first index ≈ ${duration(sum.seconds)}` +
          (args.code ? `, index ≈ ${formatBytes(Math.trunc(sum.bytes))}` : ""),
      );
      console.log("  " + (kinds.length === 0 ? "nothing to index" : kinds.join(" · ")));
      if (sum.longFiles > 0) {
        console.log(
          `  then the rest of ${number(sum.longFiles)} long ${sum.longFiles === 1 ? "file" : "files"} ≈ ${duration(sum.laterSeconds)}`,
        );
      }
      const subfolders = [...groups]
        .filter(([key]) => key !== root)
        .sort((a, b) => b[1].seconds - a[1].seconds || (a[0] < b[0] ? -1 : 1));
      if (subfolders.length > 0) {
        console.log(
          "  biggest subfolders: " +
            subfolders
              .slice(0, 5)
              .map(([key, part]) => `${basename(key)} ≈ ${duration(part.seconds)}`)
              .join(" · ") +
            (subfolders.length > 5 ? ` · ${subfolders.length - 5} more` : ""),
        );
      }
      if (Object.keys(report.skipped).length > 0) console.log("  skipped: " + skippedLine(report.skipped));
      if (Object.keys(report.skippedFolders).length > 0)
        console.log("  folders not walked: " + skippedLine(report.skippedFolders));
      for (const [dataset, count] of Object.entries(report.datasets).sort((a, b) => b[1] - a[1])) {
        console.log(`  looks like a dataset (skipped): ${tilde(dataset)} (${number(count)} files)`);
      }
      console.log(`  (looked at it in ${fixed((performance.now() - started) / 1000, 2)} s)`);
    }
    if (args.positional.length > 1) console.log(`all together ≈ ${duration(total)}`);
  } finally {
    await parts.close();
  }
}

// ---------------------------------------------------------------------------------------------------------------------

const USAGE = `dig up: search your files by meaning (developer CLI over the engine, no daemon)

  cli.ts index <folder>... --index DIR [--code] [--limit N] [--reindex]
  cli.ts search <words>... --index DIR [--kind K,K] [-n 10] [--json]     "code: <words>" searches the code index
  cli.ts status --index DIR [--code]
  cli.ts eval <queries.json> --index DIR [-n 10] [--zgate Z] [--word-weight W]
  cli.ts estimate <folder>... --index DIR [--code]

Options: --exclude DIR, --exclude-ext EXT, --llama PATH, --models DIR`;

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "-h" || command === "--help" || command === "help") {
    console.log(USAGE);
    return 0;
  }
  const args = new Arguments(rest);
  switch (command) {
    case "index":
      await index(args);
      return 0;
    case "search":
      await search(args);
      return 0;
    case "status":
      status(args);
      return 0;
    case "eval":
      await evaluate(args);
      return 0;
    case "estimate":
      await estimateCommand(args);
      return 0;
    default:
      console.log(USAGE);
      return 2;
  }
}

if (require.main === module) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    },
  );
}
