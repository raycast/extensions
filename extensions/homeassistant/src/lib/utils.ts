import * as fs from "fs";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import plist from "plist";
import { setTimeout } from "timers/promises";
import { State } from "./haapi";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export function stringToDate(ds: string | null | undefined): Date | undefined {
  try {
    if (!ds || ds.trim().length <= 0) {
      return undefined;
    }
    if (!isNaN(Date.parse(ds))) {
      return new Date(ds);
    }
  } catch (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    error
  ) {
    return;
  }
}

export function formatToHumanDateTime(input: Date | string | undefined): string | undefined {
  try {
    if (!input) {
      return;
    }

    const date = typeof input === "string" ? stringToDate(input) : input;
    if (!date) {
      return undefined;
    }
    return timeAgo.format(date) as string;
  } catch (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    error
  ) {
    return undefined;
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export function ensureMinMax(v1: number, v2: number): [min: number, max: number] {
  if (v1 < v2) {
    return [v1, v2];
  }
  return [v2, v1];
}

export function getFriendlyName(state: State): string {
  return state.attributes.friendly_name || state.entity_id;
}

export function getStateTooltip(state: State): string {
  const lastChanged = formatToHumanDateTime(state.last_changed) || "?";
  const lastUpdated = formatToHumanDateTime(state.last_updated) || "?";
  return `Last Changed: ${lastChanged}\nLast Updated: ${lastUpdated}`;
}

export function getMacOSVersion(): string {
  const versionInfo = plist.parse(fs.readFileSync("/System/Library/CoreServices/SystemVersion.plist", "utf8"));
  return JSON.parse(JSON.stringify(versionInfo)).ProductUserVisibleVersion;
}

export function range(from: number, to: number, step: number) {
  return [...Array(Math.floor((to - from) / step) + 1)].map((_, i) => from + i * step);
}

export function capitalizeFirstLetter(name: string | undefined): string | undefined {
  if (name === undefined) {
    return;
  }
  if (!name || name.length <= 0) {
    return name;
  }
  return name.replace(/^./, name[0].toUpperCase());
}

export async function sleep(delay: number) {
  await setTimeout(delay);
}

export function ensureShort(text: string | undefined, options?: { max?: number }): string | undefined {
  if (!text) {
    return text;
  }
  const max = options?.max !== undefined && options.max > 0 ? options.max : 80;
  if (text.length > max) {
    return text.slice(0, max) + " ...";
  }
  return text;
}
