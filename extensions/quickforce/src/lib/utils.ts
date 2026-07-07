export const ORG_COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: "Blue", hex: "#0000FF" },
  { name: "Red", hex: "#FF3B30" },
  { name: "Orange", hex: "#FF9500" },
  { name: "Yellow", hex: "#FFCC00" },
  { name: "Green", hex: "#34C759" },
  { name: "Teal", hex: "#30B0C7" },
  { name: "Purple", hex: "#AF52DE" },
  { name: "Pink", hex: "#FF2D55" },
];

export function formatDate(dateString?: string): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return date.toLocaleDateString();
}

function csvCell(value: unknown): string {
  let str: string;
  if (value === null || value === undefined) {
    str = "";
  } else if (typeof value === "object") {
    const named = value as { Name?: unknown };
    str = typeof named.Name === "string" ? named.Name : JSON.stringify(value);
  } else {
    str = String(value);
  }

  if (/^\s*[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function recordsToCsv(records: Record<string, unknown>[]): string {
  const fields = Array.from(new Set(records.flatMap((r) => Object.keys(r)))).filter((f) => f !== "attributes");

  const rows = records.map((record) => fields.map((field) => csvCell(record[field])).join(","));

  return [fields.map(csvCell).join(","), ...rows].join("\n");
}
