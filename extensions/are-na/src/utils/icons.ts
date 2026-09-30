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

/** Wrap a bounded excerpt without splitting emoji or other grapheme clusters. */
function textPreviewLines(text: string): string[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const characters = Array.from(
    segmenter.segment(text.trim().replace(/\r\n?/g, "\n").replace(/\t/g, "  ").slice(0, 4000)),
    ({ segment }) => segment,
  );
  const lines: string[] = [];
  let remaining = characters;
  while (remaining.length && lines.length < 9) {
    const newline = remaining.findIndex((character) => character === "\n" || character === "\r\n");
    let end = Math.min(25, remaining.length);
    if (newline >= 0 && newline < end) end = newline;
    else if (remaining.length > end) {
      const space = remaining.slice(0, end + 1).lastIndexOf(" ");
      if (space > 0) end = space;
    }
    lines.push(remaining.slice(0, end).join(""));
    remaining = remaining.slice(end);
    if ([" ", "\n", "\r\n"].includes(remaining[0])) remaining = remaining.slice(1);
  }
  if (remaining.length && lines.length) {
    const lastLine = Array.from(segmenter.segment(lines[lines.length - 1]), ({ segment }) => segment);
    lines[lines.length - 1] = lastLine.slice(0, 24).join("") + "…";
  }
  return lines;
}

function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${svg.replaceAll("\n", "").replaceAll("\t", "")}`;
}

export const textIcon = (text: string): Image.ImageLike => {
  const lines = textPreviewLines(text.trim() || "No text content");
  const source = (background: string, foreground: string) => {
    const labels = lines
      .map(
        (line, index) =>
          `<text x="24" y="${44 + index * 28}" font-size="18" font-family="Menlo" fill="${foreground}">${escapeXml(line)}</text>`,
      )
      .join("");
    return svgDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" rx="12" fill="${background}"/>${labels}</svg>`,
    );
  };
  return { source: { light: source("#f5f4f0", "#242424"), dark: source("#292929", "#eeeeea") } };
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

  return {
    source: svgDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="12" fill="${bg}"/><text x="100" y="88" text-anchor="middle" font-size="16" font-weight="600" fill="#1a1a1a" font-family="system-ui, sans-serif">${displayTitle}</text><text x="100" y="116" text-anchor="middle" font-size="13" fill="#555" font-family="system-ui, sans-serif">${countText}</text></svg>`,
    ),
  };
};

export const userIcon = (user: { avatar?: string; full_name?: string }): Image.ImageLike => {
  if (user.avatar) {
    return { source: user.avatar, mask: Image.Mask.Circle };
  }
  return { source: Icon.Person };
};

export const getIconSource = (block: Block, previewText = false): Image.ImageLike => {
  const raw = block.image?.thumb?.url || block.image?.display?.url || block.image?.original?.url;
  if (isHttpUrl(raw)) {
    return { source: raw };
  }
  if (block.class === "Text") {
    if (!previewText) return { source: Icon.Paragraph };
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
