import { LocalStorage, environment } from "@raycast/api";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { MonthKey, isMonthKey } from "./month";

export const CHAIN_COUNT = 5;
export const CHAIN_IDS = Array.from({ length: CHAIN_COUNT }, (_, index) => `chain-${index + 1}`);

export interface ChainData {
  /** Crossed-off days, keyed by `YYYY-MM`. */
  marks: Record<MonthKey, number[]>;
  /** The month currently on display. Never advances on its own. */
  viewMonth?: MonthKey;
}

export const EMPTY_CHAIN: ChainData = { marks: {} };

/**
 * Marks live in two places: a JSON file under the extension's support directory,
 * which survives extension reloads and updates, and LocalStorage, which is read
 * first so the menu bar can draw itself without touching the disk. Both are
 * written together and merged on read, so a wipe of either one is recoverable.
 */
function chainFile(id: string): string {
  return path.join(environment.supportPath, `${id}.json`);
}

function sanitize(value: unknown): ChainData {
  if (typeof value !== "object" || value === null) return EMPTY_CHAIN;
  const raw = value as Partial<ChainData>;
  const marks: Record<MonthKey, number[]> = {};

  for (const [month, days] of Object.entries(raw.marks ?? {})) {
    if (!isMonthKey(month) || !Array.isArray(days)) continue;
    const valid = days.filter((day) => Number.isInteger(day) && day >= 1 && day <= 31);
    if (valid.length > 0) {
      marks[month] = [...new Set(valid)].sort((a, b) => a - b);
    }
  }

  return { marks, viewMonth: isMonthKey(raw.viewMonth) ? raw.viewMonth : undefined };
}

function parse(json: string | undefined): ChainData | undefined {
  if (!json) return undefined;
  try {
    return sanitize(JSON.parse(json));
  } catch {
    return undefined;
  }
}

function merge(primary: ChainData | undefined, backup: ChainData | undefined): ChainData {
  if (!primary) return backup ?? EMPTY_CHAIN;
  if (!backup) return primary;

  const marks: Record<MonthKey, number[]> = { ...primary.marks };
  for (const [month, days] of Object.entries(backup.marks)) {
    marks[month] = [...new Set([...(marks[month] ?? []), ...days])].sort((a, b) => a - b);
  }
  return { marks, viewMonth: primary.viewMonth ?? backup.viewMonth };
}

export async function loadChain(id: string): Promise<ChainData> {
  const [cached, persisted] = await Promise.all([
    LocalStorage.getItem<string>(id).then(parse).catch(noneOnError),
    fs
      .readFile(chainFile(id), "utf8")
      .then(parse)
      .catch(() => undefined),
  ]);
  return merge(cached, persisted);
}

function noneOnError(): undefined {
  return undefined;
}

export async function saveChain(id: string, data: ChainData): Promise<void> {
  const json = JSON.stringify(data);
  await LocalStorage.setItem(id, json);

  await fs.mkdir(environment.supportPath, { recursive: true });
  // Write through a temporary file so an interrupted write can't truncate the history.
  const temporary = `${chainFile(id)}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, json, "utf8");
  await fs.rename(temporary, chainFile(id));
}

export function toggleDay(data: ChainData, month: MonthKey, day: number): ChainData {
  const days = new Set(data.marks[month] ?? []);
  if (!days.delete(day)) {
    days.add(day);
  }

  const marks = { ...data.marks };
  if (days.size > 0) {
    marks[month] = [...days].sort((a, b) => a - b);
  } else {
    delete marks[month];
  }
  return { ...data, marks };
}

export function clearMonth(data: ChainData, month: MonthKey): ChainData {
  const marks = { ...data.marks };
  delete marks[month];
  return { ...data, marks };
}
