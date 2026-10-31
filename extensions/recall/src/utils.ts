import { useEffect, useState } from "react";

/** Formats created_at, which the API may send as ISO or as pre-formatted text like "Jan 15, 2025". */
export function formatDate(value: string | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (!isNaN(d.getTime()) && /(\d{4}-\d{2}-\d{2})|[TZ]|GMT/.test(value)) {
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  return value;
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function firstLine(text: string, max = 80): string {
  const line = text.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.length > max ? line.slice(0, max) + "…" : line;
}
