// How long the first index takes (DigUp: Estimator.swift), and what indexing costs on this Mac (DigUp:
// MeasuredCosts.swift, kept in costs.json beside the index). From metadata alone: counts, PDF page counts and media
// durations (Spotlight, else the file's header, through the helper); nothing is decoded.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Helper } from "./helper";
import { FolderSelection } from "./rules";
import type { Candidate } from "./store";
import type { FileKind, IndexOptions } from "./types";

/**
 * Seconds of indexing per unit, measured by DigUp on an M4 Pro with llama.cpp (Q8_0), reading files while the model
 * embeds. Other Macs go by what indexing measures there once it has enough (`MeasuredCosts`).
 */
export interface Costs {
  image: number;
  screenshot: number;
  pdfPage: number;
  docChunk: number;
  audioSecond: number;
  videoSecond: number;
  codeStretch: number;
}

export const FIXED_COSTS: Readonly<Costs> = Object.freeze({
  image: 0.12, // 140 tokens, decode included
  screenshot: 0.32, // 280 tokens; its OCR (0.24 s) runs alongside and sets the pace
  pdfPage: 0.09, // text pages are cheap, rendered scans cost an image
  docChunk: 0.045, // 40 at a time (a data dump's go to keyword search only, nearly free)
  audioSecond: 0.0089, // a 30 s window every 25 s
  videoSecond: 0.019, // a 70-token keyframe per shot (at most one per 3 s) + the soundtrack
  codeStretch: 0.037,
});

const COST_NAMES = Object.keys(FIXED_COSTS) as Array<keyof Costs>;

/** How big the code index gets: its words (~2.4 bytes a character of code) and a vector row per stretch. */
export const CodeIndexSize = { perCharacter: 2.4, perStretch: 1600, charactersPerStretch: 1400 } as const;

export interface Estimate {
  files: Partial<Record<FileKind, number>>;
  /** Pages the first pass reads, and all of them. */
  pdfPages: number;
  pdfPagesTotal: number;
  audioSeconds: number;
  videoSeconds: number;
  /** Chunks the first pass reads. */
  docChunks: number;
  /** The first pass. */
  seconds: number;
  /** Long PDFs and documents, and how long the rest of them takes once everything else is in. */
  longFiles: number;
  laterSeconds: number;
  /** The code index: its stretches, and about how big it gets on disk. */
  codeStretches: number;
  bytes: number;
  /** The first pass's seconds by kind. */
  kindSeconds: Partial<Record<FileKind, number>>;
}

export function emptyEstimate(): Estimate {
  return {
    files: {},
    pdfPages: 0,
    pdfPagesTotal: 0,
    audioSeconds: 0,
    videoSeconds: 0,
    docChunks: 0,
    seconds: 0,
    longFiles: 0,
    laterSeconds: 0,
    codeStretches: 0,
    bytes: 0,
    kindSeconds: {},
  };
}

export function addEstimates(a: Estimate, b: Estimate): Estimate {
  const merge = (x: Partial<Record<FileKind, number>>, y: Partial<Record<FileKind, number>>) => {
    const out = { ...x };
    for (const [kind, value] of Object.entries(y) as Array<[FileKind, number]>) out[kind] = (out[kind] ?? 0) + value;
    return out;
  };
  return {
    files: merge(a.files, b.files),
    pdfPages: a.pdfPages + b.pdfPages,
    pdfPagesTotal: a.pdfPagesTotal + b.pdfPagesTotal,
    audioSeconds: a.audioSeconds + b.audioSeconds,
    videoSeconds: a.videoSeconds + b.videoSeconds,
    docChunks: a.docChunks + b.docChunks,
    seconds: a.seconds + b.seconds,
    longFiles: a.longFiles + b.longFiles,
    laterSeconds: a.laterSeconds + b.laterSeconds,
    codeStretches: a.codeStretches + b.codeStretches,
    bytes: a.bytes + b.bytes,
    kindSeconds: merge(a.kindSeconds, b.kindSeconds),
  };
}

/** Page counts of PDFs and durations of recordings, by path. */
export interface FileFactsLookup {
  pages: ReadonlyMap<string, number>;
  durations: ReadonlyMap<string, number>;
}

/** Asks the helper for the page counts and durations `estimate` needs, a few hundred files a call. */
export async function lookUpFacts(
  candidates: readonly Candidate[],
  helper: Pick<Helper, "pages" | "durations">,
  signal?: AbortSignal,
): Promise<FileFactsLookup> {
  const pdfs = candidates.filter((file) => file.kind === "pdf").map((file) => file.path);
  const media = candidates.filter((file) => file.kind === "audio" || file.kind === "video").map((file) => file.path);
  const pages = new Map<string, number>();
  const durations = new Map<string, number>();
  const BATCH = 500;
  for (let at = 0; at < pdfs.length; at += BATCH) {
    signal?.throwIfAborted();
    const part = pdfs.slice(at, at + BATCH);
    (await helper.pages(part)).forEach((count, index) => pages.set(part[index], count));
  }
  for (let at = 0; at < media.length; at += BATCH) {
    signal?.throwIfAborted();
    const part = media.slice(at, at + BATCH);
    (await helper.durations(part)).forEach((seconds, index) => durations.set(part[index], seconds));
  }
  return { pages, durations };
}

/** First-pass time of `candidates` (DigUp: Estimator.estimate). */
export function estimate(
  candidates: readonly Candidate[],
  options: IndexOptions,
  costs: Costs,
  facts: FileFactsLookup,
): Estimate {
  const out = emptyEstimate();
  for (const file of candidates) {
    out.files[file.kind] = (out.files[file.kind] ?? 0) + 1;
    const before = out.seconds;
    switch (file.kind) {
      case "image":
        out.seconds += costs.image;
        break;
      case "screenshot":
        out.seconds += costs.screenshot;
        break;
      case "pdf": {
        const total = facts.pages.get(file.path) ?? 1;
        const all = Math.min(total, options.maxPages);
        const first = total > options.bigPDFPages ? Math.min(options.pdfStep, all) : all;
        out.pdfPagesTotal += total;
        out.pdfPages += first;
        out.seconds += first * costs.pdfPage;
        if (all > first) {
          out.longFiles++;
          out.laterSeconds += (all - first) * costs.pdfPage;
        }
        break;
      }
      case "doc": {
        const all = Math.max(1, Math.min(options.maxChunks, Math.trunc(file.size / 2000)));
        const first = Math.min(all, options.docStep);
        out.docChunks += first;
        out.seconds += first * costs.docChunk;
        if (all > first) {
          out.longFiles++;
          out.laterSeconds += (all - first) * costs.docChunk;
        }
        break;
      }
      case "audio": {
        const seconds = facts.durations.get(file.path) ?? 0;
        out.audioSeconds += seconds;
        out.seconds += seconds * costs.audioSecond;
        break;
      }
      case "video": {
        const seconds = facts.durations.get(file.path) ?? 0;
        out.videoSeconds += seconds;
        out.seconds += seconds * costs.videoSecond;
        break;
      }
      case "code": {
        // A notebook's file is mostly its outputs, which aren't read: a guess at its cells' share.
        const characters = file.path.toLowerCase().endsWith(".ipynb") ? Math.trunc(file.size / 8) : file.size;
        const per = CodeIndexSize.charactersPerStretch;
        const stretches = Math.max(1, Math.trunc((characters + per - 1) / per));
        out.codeStretches += stretches;
        out.seconds += stretches * costs.codeStretch;
        out.bytes += characters * CodeIndexSize.perCharacter + stretches * CodeIndexSize.perStretch;
        break;
      }
    }
    out.kindSeconds[file.kind] = (out.kindSeconds[file.kind] ?? 0) + out.seconds - before;
  }
  return out;
}

/**
 * Estimates for each subfolder one level down, and for the files right in `folder` (under its own path): where a big
 * first pass comes from. Subfolders are named under `folder` as given, though the walk reports real paths.
 */
export function estimatesBySubfolder(
  candidates: readonly Candidate[],
  folder: string,
  options: IndexOptions,
  costs: Costs,
  facts: FileFactsLookup,
): Map<string, Estimate> {
  const prefix = folder.endsWith("/") ? folder : folder + "/";
  const real = FolderSelection.realPath(folder) + "/";
  const groups = new Map<string, Candidate[]>();
  for (const file of candidates) {
    const rest = file.path.startsWith(prefix)
      ? file.path.slice(prefix.length)
      : file.path.startsWith(real)
        ? file.path.slice(real.length)
        : null;
    const slash = rest === null ? -1 : rest.indexOf("/");
    const key = rest !== null && slash >= 0 ? prefix + rest.slice(0, slash) : folder;
    const group = groups.get(key);
    if (group) group.push(file);
    else groups.set(key, [file]);
  }
  return new Map([...groups].map(([key, files]) => [key, estimate(files, options, costs, facts)]));
}

// ---------------------------------------------------------------------------------------------------------------------
// Measured costs
// ---------------------------------------------------------------------------------------------------------------------

export interface Tally {
  seconds: number;
  units: number;
}

/** How this Mac compares to DigUp's M4 Pro (written by DigUp's `digup speed`; Dig Up reads it when it is there). */
export interface Speed {
  embedding: number;
  ocr: number;
  kinds?: Record<string, number>;
  device?: string;
  checks?: number;
  doubtful?: boolean;
}

/** Units a kind needs before its measured cost is trusted: a few dozen files, or minutes of media. */
const ENOUGH: Readonly<Record<string, number>> = {
  image: 20,
  screenshot: 20,
  pdfPage: 30,
  docChunk: 30,
  audioSecond: 600,
  videoSecond: 600,
  codeStretch: 100,
};

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** What indexing costs on this Mac: seconds and units summed kind by kind as jobs finish (DigUp: MeasuredCosts). */
export class MeasuredCosts {
  tallies: Record<string, Tally> = {};
  speed: Speed | null = null;

  get hasTallies(): boolean {
    return Object.keys(this.tallies).length > 0;
  }

  /** A job that took `seconds` for `units` of `name`. Recent work counts most: past ten times what's enough, what came
   *  before is halved. */
  add(name: string, units: number, seconds: number): void {
    if (!(units > 0) || !(seconds > 0)) return;
    const tally = this.tallies[name] ?? { seconds: 0, units: 0 };
    if (tally.units > 10 * (ENOUGH[name] ?? 20)) {
      tally.seconds /= 2;
      tally.units /= 2;
    }
    tally.seconds += seconds;
    tally.units += units;
    this.tallies[name] = tally;
  }

  /** The fixed costs as fast as `speed` says. */
  get expected(): Costs {
    const costs: Costs = { ...FIXED_COSTS };
    const speed = this.speed;
    if (speed?.kinds) {
      // A PC's processor can be fifty times slower than the M4 Pro's GPU.
      for (const name of COST_NAMES) costs[name] *= clamp(speed.kinds[name] ?? 1, 0.1, 500);
    } else if (speed) {
      const embedding = clamp(speed.embedding, 0.25, 10);
      const ocr = clamp(speed.ocr, 0.25, 10);
      for (const name of COST_NAMES) costs[name] *= embedding;
      costs.screenshot = FIXED_COSTS.screenshot * Math.max(embedding, ocr); // OCR runs beside the model
    }
    return costs;
  }

  /** How indexing here compares with what was expected: the seconds-weighted geometric mean of measured over expected,
   *  over the kinds with enough measured. Null before any has enough. */
  get pace(): number | null {
    const expected = this.expected;
    let sum = 0;
    let weights = 0;
    for (const name of COST_NAMES) {
      const tally = this.tallies[name];
      if (!tally || tally.units < (ENOUGH[name] ?? Infinity) || !(tally.seconds > 0) || !(expected[name] > 0)) continue;
      sum += tally.seconds * Math.log(tally.seconds / tally.units / expected[name]);
      weights += tally.seconds;
    }
    return weights > 0 ? Math.exp(sum / weights) : null;
  }

  /** The costs to estimate with: measured ones where there are enough; else the expected ones at the pace indexing has
   *  kept here. */
  get costs(): Costs {
    const costs = this.expected;
    const pace = clamp(this.pace ?? 1, 0.02, 50);
    for (const name of COST_NAMES) {
      const tally = this.tallies[name];
      if (tally && tally.units >= (ENOUGH[name] ?? Infinity)) costs[name] = tally.seconds / tally.units;
      else costs[name] *= pace;
    }
    return costs;
  }

  static file(folder: string): string {
    return join(folder, "costs.json");
  }

  /** What's saved in `folder`, or nothing measured yet. */
  static load(folder: string): MeasuredCosts {
    const measured = new MeasuredCosts();
    try {
      const saved = JSON.parse(readFileSync(MeasuredCosts.file(folder), "utf8")) as {
        tallies?: Record<string, Tally>;
        speed?: Speed;
      };
      for (const [name, tally] of Object.entries(saved.tallies ?? {})) {
        if (Number.isFinite(tally?.seconds) && Number.isFinite(tally?.units)) {
          measured.tallies[name] = { seconds: tally.seconds, units: tally.units };
        }
      }
      if (saved.speed && Number.isFinite(saved.speed.embedding) && Number.isFinite(saved.speed.ocr)) {
        measured.speed = saved.speed;
      }
    } catch {
      // nothing measured yet, or a file this can't read
    }
    return measured;
  }

  /** Writes it whole (a file renamed into place, so a reader never sees half of it). */
  save(folder: string): void {
    const file = MeasuredCosts.file(folder);
    const sorted = (object: Record<string, unknown>) =>
      Object.fromEntries(
        Object.keys(object)
          .sort()
          .map((key) => [key, object[key]]),
      );
    const body: Record<string, unknown> = { tallies: sorted(this.tallies) };
    if (this.speed) body.speed = sorted(this.speed as unknown as Record<string, unknown>);
    try {
      mkdirSync(dirname(file), { recursive: true });
      const temporary = `${file}.${process.pid}.tmp`;
      writeFileSync(temporary, JSON.stringify(sorted(body), null, 2) + "\n");
      renameSync(temporary, file);
    } catch {
      // estimates fall back to the fixed costs
    }
  }

  /** Adds `measured` to what's saved in `folder` (the main index and the code index each add their own kinds). */
  static merge(measured: MeasuredCosts, folder: string): void {
    const saved = MeasuredCosts.load(folder);
    for (const [name, tally] of Object.entries(measured.tallies)) saved.add(name, tally.units, tally.seconds);
    saved.save(folder);
  }
}
