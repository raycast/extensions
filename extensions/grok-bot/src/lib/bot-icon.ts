import { existsSync } from "node:fs";
import { environment, Image } from "@raycast/api";
import { avatarFilePath } from "./avatar-thumbnail";
import { Bot } from "./types";

const FALLBACK_FILL = "#6B7280";
const PALETTE = ["#2563EB", "#7C3AED", "#DB2777", "#DC2626", "#D97706", "#059669", "#0891B2"] as const;

function colorFromName(name: string): string {
  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length] ?? FALLBACK_FILL;
}

function initial(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return "?";
  }
  return [...trimmed][0]?.toUpperCase() ?? "?";
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function letterSvgIcon(bot: Bot): string {
  const fill = bot.avatarColor ?? colorFromName(bot.name);
  const letter = escapeXml(initial(bot.name));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${escapeXml(fill)}"/><text x="32" y="42" text-anchor="middle" font-size="28" font-family="-apple-system,BlinkMacSystemFont,sans-serif" fill="#fff">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function botListIcon(bot: Bot, supportPath: string = environment.supportPath): Image.ImageLike {
  if (typeof bot.avatarHash === "string") {
    const path = avatarFilePath({ supportPath, agentId: bot.id, hash: bot.avatarHash });
    if (existsSync(path)) {
      return { source: path, mask: Image.Mask.Circle };
    }
  }
  return letterSvgIcon(bot);
}
