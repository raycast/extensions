import { Color } from "@raycast/api";
import { ApiEntry, ExpiryStatus, getExpiryStatus } from "./types";

export function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

export function expiryStatusColor(status: ExpiryStatus): Color {
  switch (status) {
    case "expired":
      return Color.Red;
    case "expiring-soon":
      return Color.Yellow;
    case "active":
      return Color.Green;
    case "no-expiry":
      return Color.SecondaryText;
  }
}

export function expiryStatusLabel(
  status: ExpiryStatus,
  entry: ApiEntry,
): string {
  switch (status) {
    case "expired":
      return `Expired ${formatDate(entry.expiresAt!)}`;
    case "expiring-soon": {
      const days = Math.ceil(
        (new Date(entry.expiresAt!).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );
      return days === 0 ? "Expires today" : `Expires in ${days}d`;
    }
    case "active":
      return `Expires ${formatDate(entry.expiresAt!)}`;
    case "no-expiry":
      return "No expiry";
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function buildDetailMarkdown(entry: ApiEntry): string {
  const status = getExpiryStatus(entry);
  const statusBadge: Record<ExpiryStatus, string> = {
    expired: "🔴 Expired",
    "expiring-soon": "🟡 Expiring Soon",
    active: "🟢 Active",
    "no-expiry": "⚪ No Expiry",
  };

  const lines: string[] = [`# ${entry.name}`, ``];

  if (entry.provider) {
    lines.push(`**Provider:** ${entry.provider}`);
  }
  lines.push(`**Status:** ${statusBadge[status]}`);
  lines.push(``);

  lines.push(`## API Key`);
  lines.push(`\`\`\``);
  lines.push(maskKey(entry.key));
  lines.push(`\`\`\``);
  lines.push(`_(Use ⌘C to copy the full key)_`);
  lines.push(``);

  if (entry.tags.length > 0) {
    lines.push(`## Tags`);
    lines.push(entry.tags.map((t) => `\`${t}\``).join("  "));
    lines.push(``);
  }

  if (entry.expiresAt) {
    lines.push(`## Expiry`);
    lines.push(expiryStatusLabel(status, entry));
    lines.push(``);
  }

  if (entry.url) {
    lines.push(`## URL`);
    lines.push(`[${entry.url}](${entry.url})`);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(
    `_Added: ${formatDate(entry.createdAt)} · Updated: ${formatDate(entry.updatedAt)}_`,
  );

  return lines.join("\n");
}
