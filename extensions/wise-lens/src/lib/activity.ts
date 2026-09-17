import { Color } from "@raycast/api";
import { classifyDirection, parseAmount, stripHtml } from "./classify";
import { formatMoney } from "./format";
import { Direction, ParsedAmount, WiseActivity } from "./types";

export const ACTIVITY_STATUS_COLORS: Record<string, Color> = {
  COMPLETED: Color.Green,
  PENDING: Color.Yellow,
  CANCELLED: Color.Red,
  REJECTED: Color.Red,
  REFUNDED: Color.Blue,
};

export const ACTIVITY_DIRECTION_COLORS: Record<Direction, Color> = {
  in: Color.Green,
  out: Color.Red,
  neutral: Color.SecondaryText,
};

export interface ParsedActivity {
  direction: Direction;
  title: string;
  description: string;
  primary: ParsedAmount | null;
  secondary: ParsedAmount | null;
}

export function parseActivity(activity: WiseActivity): ParsedActivity {
  return {
    direction: classifyDirection(activity),
    title: stripHtml(activity.title) || activity.type,
    description: stripHtml(activity.description),
    primary: parseAmount(activity.primaryAmount),
    secondary: parseAmount(activity.secondaryAmount),
  };
}

export function formatSignedPrimaryAmount(
  direction: Direction,
  primary: ParsedAmount | null,
  fallback: string,
  numberFormat: string,
): string {
  if (!primary) return fallback;
  const sign = direction === "out" ? "-" : direction === "in" ? "+" : "";
  return `${sign}${formatMoney(primary.value, primary.currency, numberFormat)}`;
}
