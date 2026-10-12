export const SLOT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type Slot = (typeof SLOT_NUMBERS)[number];

export type CaptureSourceSetting =
  "selection-then-clipboard" | "selection" | "clipboard";

export const MAX_SLOT_LENGTH = 1_000_000;

export const NOTHING_TO_COPY = "Nothing to copy";
export const ACCESSIBILITY_REQUIRED =
  "Allow Raycast in Accessibility settings, then try again";
export const TEXT_TOO_LONG = "That text is too long to store in a slot";

export type SelectionRead =
  { ok: true; text: string } | { ok: false; permissionDenied: boolean };

export type CaptureResult =
  | { ok: true; text: string; source: "selection" | "clipboard" }
  | { ok: false; message: string };

export function isSlot(value: number): value is Slot {
  return SLOT_NUMBERS.includes(value as Slot);
}

export function slotKey(slot: Slot): string {
  return `clipboard-slot-${slot}`;
}

export function suggestedSaveHotkey(slot: Slot): string {
  return `⌘⌥${slot}`;
}

export function suggestedPasteHotkey(slot: Slot): string {
  return `⌘⇧${slot}`;
}

export function normalizeCaptureSource(
  value: string | undefined,
): CaptureSourceSetting {
  if (
    value === "selection" ||
    value === "clipboard" ||
    value === "selection-then-clipboard"
  ) {
    return value;
  }
  return "selection-then-clipboard";
}

export function isAccessibilityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /accessib|not authorized|not permitted|\bpermission\b|trusted/i.test(
    message,
  );
}

export function resolveCapture(input: {
  setting: CaptureSourceSetting;
  selection: SelectionRead;
  clipboardText: string | undefined;
}): CaptureResult {
  if (input.setting !== "clipboard") {
    if (!input.selection.ok && input.selection.permissionDenied) {
      return { ok: false, message: ACCESSIBILITY_REQUIRED };
    }
    if (input.selection.ok && input.selection.text.length > 0) {
      return { ok: true, text: input.selection.text, source: "selection" };
    }
    if (input.setting === "selection") {
      return { ok: false, message: NOTHING_TO_COPY };
    }
  }

  if (input.clipboardText && input.clipboardText.length > 0) {
    return { ok: true, text: input.clipboardText, source: "clipboard" };
  }

  return { ok: false, message: NOTHING_TO_COPY };
}

export function previewTitle(text: string, maxLength = 80): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  if (singleLine.length === 0) return "Blank text";
  if (maxLength < 2 || singleLine.length <= maxLength) {
    return maxLength < 2 ? "…" : singleLine;
  }
  return `${singleLine.slice(0, maxLength - 1)}…`;
}

export function formatSize(text: string): string {
  const chars = Array.from(text).length;
  if (chars === 1) return "1 char";
  if (chars < 1000) return `${chars} chars`;
  const thousands = chars / 1000;
  const rounded =
    thousands >= 100 ? String(Math.round(thousands)) : thousands.toFixed(1);
  return `${rounded}k chars`;
}

export function slotMarkdown(text: string | undefined): string {
  if (!text) {
    return "Empty. Select text and run the copy command for this slot.";
  }
  let fence = "```";
  while (text.includes(fence)) {
    fence += "`";
  }
  return `${fence}\n${text}\n${fence}`;
}

export function slotSearchKeywords(
  slot: Slot,
  text: string | undefined,
): string[] {
  const keywords = [`slot ${slot}`, String(slot)];
  if (text) {
    keywords.push(text.slice(0, 500));
  }
  return keywords;
}
