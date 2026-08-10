import { Color, Icon, Image } from "@raycast/api";
import type { Block, ChannelStatus } from "../api/types";
import { isHttpUrl } from "./url";

function escapeXml(str: string): string {
  const s = String(str ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const STATUS_COLORS: Record<ChannelStatus, { tint: Color; label: string }> = {
  public: { tint: Color.Green, label: "Open" },
  closed: { tint: Color.SecondaryText, label: "Closed" },
  private: { tint: Color.Red, label: "Private" },
};

export const STATUS_ICONS: Record<ChannelStatus, Image.ImageLike> = {
  public: { source: Icon.Eye, tintColor: Color.Green },
  closed: { source: Icon.Eye, tintColor: Color.SecondaryText },
  private: { source: Icon.EyeDisabled, tintColor: Color.Red },
};

export const textIcon = (text: string): Image.ImageLike => {
  const textLimit = 20;
  const raw = String(text ?? "");
  const truncatedText = raw.length > textLimit ? raw.slice(0, textLimit) + "..." : raw;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect x="0" y="0" width="200" height="200" fill="#b3b3b3" rx="10"></rect>
      <text x="100"
            y="100"
            text-anchor="middle"
            alignment-baseline="middle"
            lengthAdjust="spacingAndGlyphs"
            font-size="16" 
            fill="#000">
        ${escapeXml(truncatedText)}
      </text>
    </svg>
  `.replaceAll("\n", "");

  return {
    source: `data:image/svg+xml,${svg}`,
  };
};

const CHANNEL_BG: Record<ChannelStatus, string> = {
  public: "#b7e4c7",
  closed: "#e0e0e0",
  private: "#f4c2c2",
};

export const channelIcon = (title: string, status: ChannelStatus, blockCount: number): Image.ImageLike => {
  const bg = CHANNEL_BG[status];
  const safeTitle = String(title ?? "");
  const displayTitle = safeTitle.length > 18 ? escapeXml(safeTitle.slice(0, 18)) + "…" : escapeXml(safeTitle);
  const countText = `${blockCount} block${blockCount === 1 ? "" : "s"}`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="12" fill="${bg}"/><text x="100" y="88" text-anchor="middle" font-size="16" font-weight="600" fill="#1a1a1a" font-family="system-ui, sans-serif">${displayTitle}</text><text x="100" y="116" text-anchor="middle" font-size="13" fill="#555" font-family="system-ui, sans-serif">${countText}</text></svg>`.replaceAll(
      "\n",
      "",
    );

  return { source: `data:image/svg+xml,${svg}` };
};

export const userIcon = (user: { avatar?: string; full_name?: string }): Image.ImageLike => {
  if (user.avatar) {
    return { source: user.avatar, mask: Image.Mask.Circle };
  }
  return { source: Icon.Person };
};

export const getIconSource = (block: Block): Image.ImageLike => {
  const raw = block.image?.thumb?.url || block.image?.display?.url || block.image?.original?.url;
  if (isHttpUrl(raw)) {
    return { source: raw };
  }
  if (block.class === "Text") {
    const fromContent = typeof block.content === "string" ? block.content : "";
    const fromTitle = typeof block.title === "string" ? block.title : "";
    const preview = fromContent || fromTitle || String(block.title ?? block.content ?? "Text");
    return textIcon(preview);
  }
  if (block.class === "Channel") {
    return channelIcon(String(block.title ?? "Untitled"), "public", 0);
  }
  if (block.class === "PendingBlock") {
    return { source: Icon.Clock };
  }
  return { source: "extension-icon.png" };
};
