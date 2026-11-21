import { getPreferenceValues, Icon, type Image } from "@raycast/api";
import { detectLocalDevice, type DeviceIcon } from "./devices";
import { glyphFor } from "./glyphs";
import { DOTS_FRAMES, pillImage, SPINNER_FRAMES, type BadgeState, type PillIndicator } from "./pills";
import { blockStatuses, STATE_COLORS } from "./status";
import type { ProgramStatus, RexBlock, RexSnapshot, RexWindow } from "./types";

/** Rex's attention dot colours: its accent for blocked and done, its error hue for error. */
const ATTENTION_DOT = "#719FF3";

const ATTENTION_STATES = new Set<string>(["blocked", "error", "done"]);

function pillLimit(): number {
  const { tabPills } = getPreferenceValues<Preferences>();
  return Number(tabPills);
}

function hasProgress(status: ProgramStatus): boolean {
  return typeof status.progress === "number" && Number.isFinite(status.progress);
}

/**
 * What the blocks' activity should put on their pill, honouring the indicator preferences.
 * Urgency: blocked, error, done, then working with progress, then working.
 */
export function indicatorFor(blocks: RexBlock[], frame = 0): PillIndicator | undefined {
  const { attentionStyle, progressStyle, workingStyle } = getPreferenceValues<Preferences>();
  const statuses = blockStatuses(blocks); // most urgent first
  const attention = statuses.find((status) => ATTENTION_STATES.has(status.state));
  if (attention) {
    switch (attentionStyle) {
      case "badge":
        return { kind: "badge", state: attention.state as BadgeState };
      case "none":
        return undefined;
      default:
        return { kind: "dot", color: attention.state === "error" ? STATE_COLORS.error : ATTENTION_DOT };
    }
  }
  const working = statuses.filter((status) => status.state === "working");
  if (working.length === 0) return undefined;
  const withProgress = working.find(hasProgress);
  if (withProgress && (progressStyle === "pie" || progressStyle === "both")) {
    return { kind: "pie", progress: withProgress.progress as number };
  }
  if (withProgress) return undefined;
  switch (workingStyle) {
    case "pill-dots":
      return { kind: "dots", frame: ((frame % DOTS_FRAMES) + DOTS_FRAMES) % DOTS_FRAMES };
    case "spinner":
      return { kind: "spinner", frame: ((frame % SPINNER_FRAMES) + SPINNER_FRAMES) % SPINNER_FRAMES };
    default:
      return undefined;
  }
}

/** True when the chosen styles need a frame counter for these blocks. */
export function animates(blocks: RexBlock[]): boolean {
  const indicator = indicatorFor(blocks);
  return indicator?.kind === "dots" || indicator?.kind === "spinner";
}

/** Glyphs for a tab's stack: the focused pane in front, the rest in layout order. */
function tabGlyphs(window: RexWindow): string[] {
  const focused = window.blocks.find((b) => b.blockId === window.focusedBlockId);
  const ordered = focused ? [focused, ...window.blocks.filter((b) => b !== focused)] : window.blocks;
  return ordered
    .map(glyphFor)
    .filter((g): g is string => g !== undefined)
    .slice(0, pillLimit());
}

/** The stacked pills Rex shows on a tab, with the tab's activity on the front pill. */
export function tabIcon(window: RexWindow, frame = 0): Image.ImageLike {
  const glyphs = tabGlyphs(window);
  const image = glyphs.length ? pillImage(glyphs, "tab", indicatorFor(window.blocks, frame)) : undefined;
  return image ?? Icon.AppWindow;
}

/** A single pill for one pane, with its own activity on it. */
export function paneIcon(block: RexBlock, frame = 0): Image.ImageLike {
  const glyph = glyphFor(block);
  const image = glyph ? pillImage([glyph], "pane", indicatorFor([block], frame)) : undefined;
  return image ?? Icon.Terminal;
}

/** Paint every pill the lists will need before they render, and find out what Mac this is. */
export async function warmIcons(snapshot: RexSnapshot): Promise<DeviceIcon> {
  for (const session of snapshot.sessions) {
    for (const window of session.windows) {
      tabIcon(window);
      for (const block of window.blocks) paneIcon(block);
    }
  }
  return detectLocalDevice();
}
