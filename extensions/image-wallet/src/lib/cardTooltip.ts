import { Card, TooltipField, UsageStats } from "../types";

/** Builds a Card's tooltip: its name, then the user's chosen fields, in their chosen order. */
export function cardTooltip(card: Card, fields: TooltipField[], usage: UsageStats): string {
  const parts = fields.map((field) => describeField(card, field, usage)).filter((part): part is string => !!part);
  return [card.name, ...parts].join(" • ");
}

function describeField(card: Card, field: TooltipField, usage: UsageStats): string | undefined {
  switch (field) {
    case "date-created":
      return card.createdAtMs ? `Created ${formatDate(card.createdAtMs)}` : undefined;
    case "date-modified":
      return card.mtimeMs ? `Modified ${formatDate(card.mtimeMs)}` : undefined;
    case "size":
      return card.size ? formatFileSize(card.size) : undefined;
    case "usage": {
      const count = usage[card.path]?.count ?? 0;
      return `Used ${count} time${count === 1 ? "" : "s"}`;
    }
    case "dimensions":
      return card.width && card.height ? `${card.width}×${card.height}px` : undefined;
  }
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}
