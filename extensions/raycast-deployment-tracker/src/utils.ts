import { Color as RaycastColor } from "@raycast/api";
import type { Color } from "./types";

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso);
}

export function shortRef(ref: string): string {
  // If it looks like a full git SHA (40 hex chars), shorten it
  if (/^[0-9a-f]{40}$/i.test(ref)) return ref.slice(0, 8);
  return ref;
}

export const COLOR_MAP: Record<Color, RaycastColor> = {
  red: RaycastColor.Red,
  orange: RaycastColor.Orange,
  yellow: RaycastColor.Yellow,
  green: RaycastColor.Green,
  blue: RaycastColor.Blue,
  purple: RaycastColor.Purple,
  magenta: RaycastColor.Magenta,
  primaryText: RaycastColor.PrimaryText,
  secondaryText: RaycastColor.SecondaryText,
};

export const COLOR_OPTIONS: { label: string; value: Color }[] = [
  { label: "Red", value: "red" },
  { label: "Orange", value: "orange" },
  { label: "Yellow", value: "yellow" },
  { label: "Green", value: "green" },
  { label: "Blue", value: "blue" },
  { label: "Purple", value: "purple" },
  { label: "Magenta", value: "magenta" },
];
