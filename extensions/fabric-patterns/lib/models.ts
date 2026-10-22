// fabric's models, each with its vendor, and the model pinned to a pattern. Pure: the KV is
// injected (as in store.ts), so this stays bun-testable.
//
// `-L` is one flat table of `[N]\tVendor|model` rows, `*` marking fabric's default, with no
// per-vendor sections (probed on fabric 1.4.518). The same model name can sit under two vendors
// (Anthropic and ClaudeCode share 14), so a model is always kept and sent with its vendor.

import { isPlainName } from "./argv";
import { type KV, serialize } from "./store";

export interface ModelPair {
  vendor: string;
  model: string;
}

export interface ModelRow extends ModelPair {
  /** fabric's default model (`*` in `-L`). */
  isDefault: boolean;
}

const ROW = /^\s*(\*)?\s*\t\[\d+\]\t([^|\t]+)\|(.+?)\s*$/;

export function parseModels(stdout: string): ModelRow[] {
  return stdout.split("\n").flatMap((line) => {
    const m = ROW.exec(line);
    return m ? [{ vendor: m[2], model: m[3], isDefault: !!m[1] }] : [];
  });
}

/** Rows by vendor, vendors in the order `-L` first names them. */
export function groupByVendor<T extends ModelPair>(rows: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const g = groups.get(r.vendor);
    if (g) g.push(r);
    else groups.set(r.vendor, [r]);
  }
  return [...groups];
}

/** One string per pair, as `-L` prints it; a dropdown value. */
export const pairKey = (p: ModelPair) => `${p.vendor}|${p.model}`;

export function parsePairKey(key: string): ModelPair | undefined {
  const bar = key.indexOf("|");
  if (bar <= 0 || bar === key.length - 1) return undefined;
  return { vendor: key.slice(0, bar), model: key.slice(bar + 1) };
}

// What a stored pair must look like to be sent: argv sends `--model=<v>`, so a value can't become
// a flag of its own, but a flag-shaped or multi-line value is never a real model and is dropped.
const goodValue = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && !v.startsWith("-") && !/[\0\n\r]/.test(v);
const goodPair = (p: unknown): p is ModelPair =>
  !!p && typeof p === "object" && goodValue((p as ModelPair).vendor) && goodValue((p as ModelPair).model);

const KEY = "models.v1";

/** Model pinned per pattern name. */
export type ModelPins = Record<string, ModelPair>;

export class ModelStore {
  constructor(private kv: KV) {}

  /** What storage holds now, re-checked: an entry that isn't a sendable pair under a plain pattern name is dropped. */
  async load(): Promise<ModelPins> {
    const raw = await this.kv.get(KEY);
    let pins: unknown;
    try {
      pins = raw ? (JSON.parse(raw) as { pins?: unknown })?.pins : undefined;
    } catch {
      return {};
    }
    if (!pins || typeof pins !== "object" || Array.isArray(pins)) return {};
    // No prototype: a pattern may be named `constructor` or `__proto__` (plain names), and a lookup
    // must find its own pin or nothing, never an inherited member (review, 2026-10-19).
    const out: ModelPins = Object.create(null);
    for (const [name, p] of Object.entries(pins))
      if (isPlainName(name) && goodPair(p)) out[name] = { vendor: p.vendor, model: p.model };
    return out;
  }

  // Read-modify-write on the queue usage.v1 uses, so a rename that moves both kinds of pin runs in order.
  private change(fn: (pins: ModelPins) => ModelPins): Promise<ModelPins> {
    return serialize(async () => {
      const next = fn(await this.load());
      await this.kv.set(KEY, JSON.stringify({ pins: next }));
      return next;
    });
  }

  pin(pattern: string, pair: ModelPair): Promise<ModelPins> {
    if (!isPlainName(pattern) || !goodPair(pair))
      return Promise.reject(new Error(`can't pin ${pairKey(pair)} to ${pattern}`));
    return this.change((pins) => ({ ...pins, [pattern]: { vendor: pair.vendor, model: pair.model } }));
  }

  /** Also how a deleted pattern's pin goes. */
  unpin(pattern: string): Promise<ModelPins> {
    return this.change((pins) => {
      const rest = { ...pins };
      delete rest[pattern];
      return rest;
    });
  }

  /** A renamed pattern keeps its pin; a pin already on the new name wins. */
  rename(from: string, to: string): Promise<ModelPins> {
    return this.change((pins) => {
      if (from === to || !Object.hasOwn(pins, from)) return pins;
      const { [from]: moved, ...rest } = pins;
      return { ...rest, [to]: Object.hasOwn(rest, to) ? rest[to] : moved };
    });
  }
}
