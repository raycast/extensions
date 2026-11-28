import type { PriceEntry, WiroModel } from "./wiro";
import { formatUsd } from "./wiro";

// The price shown before a run, worked out the way Wiro bills it (adapted from
// the Wiro AI browser extension, Wiro-Extension-Core).
//
// - The row: Wiro bills with the first row whose values all match the run's
//   settings. When any row counts files (QUANTITY:n), it bills with the valid
//   row that has the highest total count at or below what the run sends.
// - The charge per method: per-run is the price, per-output-file the price per
//   output file, per-input-character per prompt character,
//   per-input-audio-second and per-input-video-second per second of input audio
//   or video (each input at most the row's maxSeconds), per-output-video-second
//   per second of output video, per-output-megapixel per 1024 x 1024 block,
//   per-run-second per second of run time, and a run that matches no row, or a
//   row whose method Wiro does not bill by, is billed for its run time.

export interface PriceQuote {
  /** The price for these settings after any discount, when it is known up front. */
  amount?: number;
  /** True when the amount is an estimate, a starting price or a rate. */
  approximate: boolean;
  /** "$0.20", "about $0.02", "from $0.10", "$0.0001 / character", "Free". */
  label: string;
  /** A longer sentence about how the run is billed. */
  note?: string;
  /** The caller's discount on this model, in percent. */
  discountPercent?: number;
}

export interface QuoteContext {
  /** Characters of the prompt, for per-character prices. */
  promptChars?: number;
  /** Seconds of the input audio or video, when known. */
  mediaSeconds?: number;
}

interface Row {
  price: number;
  priceMethod: string;
  inputs: Record<string, unknown>;
  note?: string;
  priceExtra?: number;
  priceInput?: number;
  /** On a price per second of input audio or video: the most seconds each input counts. */
  maxSeconds?: number;
}

const RUN_TIME = "No fixed price for these settings. The charge follows the run time.";

function positive(value: unknown): number | undefined {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

/** A model's price list as rows; Tool/List sends it as a JSON string and Tool/Detail as an array. */
export function priceRows(model: Pick<WiroModel, "dynamicprice">): Row[] {
  let value: unknown = model.dynamicprice;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      value = [];
    }
  }
  if (!Array.isArray(value)) return [];
  return (value as PriceEntry[])
    .filter((row) => row && typeof row === "object" && typeof row.priceMethod === "string")
    .map((row) => {
      const extra = row as PriceEntry & { priceExtra?: unknown; priceInput?: unknown; maxSeconds?: unknown };
      return {
        price: Number(row.price) || 0,
        priceMethod: String(row.priceMethod),
        inputs: (row.inputs ?? {}) as Record<string, unknown>,
        note: typeof row.note === "string" && row.note.trim() ? row.note.replace(/\s+/g, " ").trim() : undefined,
        priceExtra: positive(extra.priceExtra),
        priceInput: positive(extra.priceInput),
        maxSeconds: positive(extra.maxSeconds),
      };
    });
}

function quantityOf(value: unknown): number | null {
  const match = /^QUANTITY:(\d+)$/.exec(String(value));
  return match ? Number(match[1]) : null;
}

function countOf(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null && item !== "").length;
  return 1;
}

// Wiro compares loosely: 5 matches "5".
function sameValue(expected: unknown, actual: unknown): boolean {
  if (actual === undefined || actual === null) return false;
  if (typeof expected === "number") return Number(actual) === expected;
  return String(actual).toLowerCase() === String(expected).toLowerCase();
}

const hasQuantity = (row: Row): boolean => Object.values(row.inputs).some((value) => quantityOf(value) !== null);

/** The row Wiro bills these settings with, or undefined when none applies. */
export function matchingRow(rows: Row[], params: Record<string, unknown>): Row | undefined {
  if (!rows.some(hasQuantity)) {
    return rows.find((row) => Object.entries(row.inputs).every(([key, expected]) => sameValue(expected, params[key])));
  }
  let best: Row | undefined;
  let bestScore = -1;
  for (const row of rows) {
    let score = 0;
    let valid = true;
    for (const [key, expected] of Object.entries(row.inputs)) {
      const quantity = quantityOf(expected);
      if (quantity === null ? !sameValue(expected, params[key]) : quantity > countOf(params[key])) {
        valid = false;
        break;
      }
      score += quantity ?? 0;
    }
    if (valid && score > bestScore) {
      best = row;
      bestScore = score;
    }
  }
  return best;
}

function countParam(params: Record<string, unknown>): number {
  for (const key of [
    "n",
    "samples",
    "maxImages",
    "max_images",
    "numberOfImages",
    "numImages",
    "numOutputs",
    "numberOfOutputs",
    "count",
    "batchSize",
    "numberOfVideos",
  ]) {
    const value = Number(params[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 1;
}

function durationParam(params: Record<string, unknown>): number | undefined {
  for (const key of ["duration", "durationSeconds", "length", "seconds", "videoLength", "videoDuration"]) {
    const value = Number(params[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return undefined;
}

function runTimeQuote(model: Pick<WiroModel, "approximatelycost" | "cps">, scale: number): PriceQuote {
  const estimate = positive(model.approximatelycost);
  if (estimate !== undefined) {
    const amount = estimate * scale;
    return {
      amount,
      approximate: true,
      label: `about ${formatUsd(amount)}`,
      note: `${RUN_TIME} Past runs averaged ${formatUsd(amount)}.`,
    };
  }
  const perSecond = positive(model.cps);
  if (perSecond !== undefined) {
    return {
      approximate: true,
      label: `${formatUsd(perSecond * scale)} / second`,
      note: `${formatUsd(perSecond * scale)} per second of run time.`,
    };
  }
  return { approximate: true, label: "by run time", note: RUN_TIME };
}

function rowQuote(row: Row, params: Record<string, unknown>, context: QuoteContext): PriceQuote {
  const price = row.price;
  const say = (sentence: string): string => row.note ?? sentence;

  switch (row.priceMethod) {
    case "per-run":
      if (price === 0) return { amount: 0, approximate: false, label: "Free", note: say("Free to run right now.") };
      return { amount: price, approximate: false, label: formatUsd(price), note: say(`${formatUsd(price)} per run.`) };
    case "per-output-file": {
      if (price === 0) return { amount: 0, approximate: false, label: "Free", note: say("Free to run right now.") };
      const count = countParam(params);
      const amount = price * count;
      return {
        amount,
        approximate: false,
        label: count > 1 ? `${formatUsd(amount)} for ${count} output files` : formatUsd(amount),
        note: say(`${formatUsd(price)} per output file.`),
      };
    }
    case "per-input-character": {
      const chars = context.promptChars ?? 0;
      if (chars === 0) {
        return {
          approximate: true,
          label: `${formatUsd(price)} / character`,
          note: say(`${formatUsd(price)} per prompt character.`),
        };
      }
      const amount = price * chars;
      return {
        amount,
        approximate: false,
        label: `${formatUsd(amount)} for ${chars.toLocaleString("en-US")} characters`,
        note: say(`${formatUsd(price)} per prompt character.`),
      };
    }
    case "per-input-audio-second":
    case "per-input-video-second":
      return inputLengthQuote(row, context);
    case "per-output-video-second": {
      const length = durationParam(params);
      if (length === undefined) {
        return {
          approximate: true,
          label: `${formatUsd(price)} / video second`,
          note: say(`${formatUsd(price)} per second of output video.`),
        };
      }
      const amount = price * length;
      return {
        amount,
        approximate: false,
        label: formatUsd(amount),
        note: say(`${formatUsd(price)} per second of output video.`),
      };
    }
    case "per-output-megapixel":
      return {
        amount: price,
        approximate: true,
        label: `from ${formatUsd(price)}`,
        note: say(`${formatUsd(price)} for an output image up to 1024 x 1024 pixels, more for larger images.`),
      };
    case "per-run-second":
      return {
        approximate: true,
        label: `${formatUsd(price)} / second`,
        note: say(`${formatUsd(price)} per second of run time.`),
      };
    case "per-total-token":
      return { approximate: true, label: "by tokens", note: say("Billed per input and output token.") };
    case "reported-price":
      return price > 0
        ? { amount: price, approximate: true, label: `about ${formatUsd(price)}`, note: say("Set when the run ends.") }
        : { approximate: true, label: "set when the run ends", note: say("Set when the run ends.") };
    case "per-realtime-turn":
      return { approximate: true, label: "per conversation turn", note: say("Billed turn by turn in a live session.") };
    default:
      return { approximate: true, label: "by run time", note: RUN_TIME };
  }
}

// A price per second of input audio or video. A row's maxSeconds caps each
// input: its runner keeps only that much of a longer one, so Wiro bills only
// that much.
function inputLengthQuote(row: Row, context: QuoteContext): PriceQuote {
  const price = row.price;
  const media = row.priceMethod === "per-input-video-second" ? "video" : "audio";
  const cap = row.maxSeconds;
  const length = context.mediaSeconds;
  const rate = row.note ?? `${formatUsd(price)} per second of input ${media}.`;
  if (length === undefined) {
    return {
      approximate: true,
      label: `${formatUsd(price)} / ${media} second`,
      note: cap === undefined ? rate : `${rate} Each input counts at most ${cap} seconds.`,
    };
  }
  const counted = cap === undefined ? length : Math.min(length, cap);
  const amount = price * counted;
  return {
    amount,
    approximate: true,
    label: `about ${formatUsd(amount)} for ${Math.round(counted)} seconds of input ${media}`,
    note:
      cap !== undefined && length > cap
        ? `${rate} Only the first ${cap} seconds of each input are processed and billed.`
        : rate,
  };
}

function scaleRow(row: Row, scale: number): Row {
  if (scale === 1) return row;
  return {
    ...row,
    price: row.price * scale,
    priceExtra: row.priceExtra === undefined ? undefined : row.priceExtra * scale,
    priceInput: row.priceInput === undefined ? undefined : row.priceInput * scale,
  };
}

/** The price of a run with these parameters, after the caller's discount when Tool/Detail sent one. */
export function quote(
  model: Pick<WiroModel, "dynamicprice" | "approximatelycost" | "cps" | "discount">,
  params: Record<string, unknown>,
  context: QuoteContext = {},
): PriceQuote {
  const percent = positive(model.discount);
  const scale = percent !== undefined && percent <= 100 ? 1 - percent / 100 : 1;
  const rows = priceRows(model);
  let result: PriceQuote;
  if (rows.length === 0) {
    result = runTimeQuote(model, scale);
  } else {
    const row = matchingRow(rows, params);
    result = row ? rowQuote(scaleRow(row, scale), params, context) : runTimeQuote(model, scale);
  }
  return scale === 1 ? result : { ...result, discountPercent: percent };
}

/** The one-line price a form shows before a run. */
export function priceLine(price: PriceQuote): string {
  return price.discountPercent ? `${price.label} (${Math.round(price.discountPercent)}% off)` : price.label;
}

/** The lowest fixed price in a model's price list, for the search list. */
export function startingPrice(model: Pick<WiroModel, "dynamicprice">): { amount: number; method: string } | undefined {
  let lowest: { amount: number; method: string } | undefined;
  for (const row of priceRows(model)) {
    if ((row.priceMethod !== "per-run" && row.priceMethod !== "per-output-file") || row.price <= 0) continue;
    if (!lowest || row.price < lowest.amount) lowest = { amount: row.price, method: row.priceMethod };
  }
  return lowest;
}

/** "From $0.035 per output file", for model details. */
export function startingPriceText(model: Pick<WiroModel, "dynamicprice" | "approximatelycost">): string | undefined {
  const lowest = startingPrice(model);
  if (lowest)
    return `From ${formatUsd(lowest.amount)} per ${lowest.method === "per-output-file" ? "output file" : "run"}`;
  const estimate = positive(model.approximatelycost);
  return estimate !== undefined ? `About ${formatUsd(estimate)} per run` : undefined;
}
