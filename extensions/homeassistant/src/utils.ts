import { State } from "./haapi";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export function stringToDate(ds: string | null | undefined): Date | undefined {
  if (!ds || ds.trim().length <= 0) {
    return undefined;
  }
  try {
    if (!isNaN(Date.parse(ds))) {
      return new Date(ds);
    }
  } catch (error) {
    return;
  }
}

export function formatToHumanDateTime(input: Date | string | undefined): string | undefined {
  if (!input) {
    return;
  }
  const date = typeof input === "string" ? stringToDate(input) : input;
  if (!date) {
    return undefined;
  }
  return timeAgo.format(date) as string;
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
