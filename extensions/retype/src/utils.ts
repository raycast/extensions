import { runAppleScript } from "@raycast/utils";

export const selectLine = () =>
  runAppleScript(`
  tell application "System Events"
    tell process (name of first application process whose frontmost is true)
      key code 123 using {command down, shift down}
      delay 0.1
    end tell
  end tell
`);

export interface LayoutKeyMap {
  id: string;
  title: string;
  active: boolean;
  keyMap: string;
}

// Positions 0-95 in keyMap = base layer (unshifted + shift).
// Positions 96-191 = alt layer (option + option+shift).
// Base-layer matches score 4× higher so a layout where the text lives on normal keys
// wins decisively over one where the same chars are only reachable via Option.
const BASE_LAYER_END = 96;
const WEIGHT_BASE = 4;
const WEIGHT_ALT = 1;

/**
 * Build a Map from character → first position in keyMap.
 * First occurrence wins (base layer priority over alt layer).
 * Null characters are skipped.
 */
function buildCharIndex(keyMap: string): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < keyMap.length; i++) {
    const ch = keyMap[i];
    if (ch !== "\u0000" && !map.has(ch)) {
      map.set(ch, i);
    }
  }
  return map;
}

/**
 * Detect which layout the text was most likely typed in.
 * Uses weighted scoring: base-layer matches count 4×, alt-layer matches 1×.
 * Tiebreaker priority: activeId > historyOrder position > original array order.
 */
export function detectSourceLayout(opts: {
  text: string;
  layouts: LayoutKeyMap[];
  activeId?: string;
  historyOrder?: string[];
}): LayoutKeyMap | null {
  const { text, layouts, activeId, historyOrder = [] } = opts;
  if (layouts.length === 0) {
    return null;
  }

  const scored = layouts.map((layout, index) => {
    const charIndex = buildCharIndex(layout.keyMap);
    let score = 0;
    for (const char of text) {
      if (char === "\u0000") {
        continue;
      }
      const pos = charIndex.get(char);
      if (pos === undefined) {
        continue;
      }
      score += pos < BASE_LAYER_END ? WEIGHT_BASE : WEIGHT_ALT;
    }
    // Tiebreaker: active layout first, then history position, then original order
    const priority =
      layout.id === activeId
        ? 0
        : historyOrder.indexOf(layout.id) !== -1
          ? historyOrder.indexOf(layout.id) + 1
          : historyOrder.length + 1 + index;
    return { layout, score, priority };
  });
  scored.sort((a, b) => b.score - a.score || a.priority - b.priority);
  return scored[0].layout;
}

/**
 * Transform text from one layout's key map to another.
 * For each character: find its position in fromMap (= physical key index),
 * then return the character at that position in toMap.
 * Null characters (\u0000) and unrecognized characters pass through unchanged.
 */
export function transformText(
  text: string,
  fromMap: string,
  toMap: string,
): string {
  const fromIndex = buildCharIndex(fromMap);
  return text
    .split("")
    .map((char) => {
      const index = fromIndex.get(char);
      if (index !== undefined && index < toMap.length) {
        const mapped = toMap[index];
        return mapped === "\u0000" ? char : mapped;
      }
      return char;
    })
    .join("");
}

export interface PickResult {
  target: LayoutKeyMap;
  transformed: string;
  triedTargetIds: string[];
}

/**
 * Pick the next target layout that produces different text.
 * Skips targets whose transformation is identical to the original.
 * Wraps around when all targets have been tried (infinite cycling).
 * Falls back to the last candidate if every target produces same text.
 */
export function pickNextTarget(
  originalText: string,
  sourceKeyMap: string,
  targetOrder: LayoutKeyMap[],
  triedTargetIds: string[] = [],
): PickResult {
  let tried = [...triedTargetIds];
  let untried = targetOrder.filter((t) => !tried.includes(t.id));
  if (untried.length === 0) {
    tried = [];
    untried = targetOrder;
  }

  let target = untried[untried.length - 1];
  let transformed = originalText;
  for (const candidate of untried) {
    const result = transformText(originalText, sourceKeyMap, candidate.keyMap);
    tried.push(candidate.id);
    if (result !== originalText) {
      target = candidate;
      transformed = result;
      break;
    }
  }

  return { target, transformed, triedTargetIds: tried };
}

/**
 * Return candidate target layouts ordered by preference:
 * active layout first, then history-preferred, then remaining in system order.
 * Source layout is always excluded.
 */
export function getTargetOrder(opts: {
  layouts: LayoutKeyMap[];
  sourceId: string;
  historyOrder: string[];
  activeId?: string;
}): LayoutKeyMap[] {
  const { layouts, sourceId, historyOrder, activeId } = opts;
  const candidates = layouts.filter((l) => l.id !== sourceId);

  const priorityIds = activeId
    ? [activeId, ...historyOrder.filter((id) => id !== activeId)]
    : historyOrder;

  const prioritized: LayoutKeyMap[] = [];
  for (const id of priorityIds) {
    const layout = candidates.find((c) => c.id === id);
    if (layout) {
      prioritized.push(layout);
    }
  }

  const rest = candidates.filter((c) => !priorityIds.includes(c.id));
  return [...prioritized, ...rest];
}
