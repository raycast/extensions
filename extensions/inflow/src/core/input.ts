// Input layer: detects selected text.
import { getSelectedText, getFrontmostApplication, Application, Clipboard } from "@raycast/api";

export type InputSource = "selected" | "none";

export interface InputResult {
  text: string;
  source: InputSource;
  app?: Application;
}

interface DetectOptions {
  /** Maximum number of retry attempts (default: 2) */
  maxAttempts?: number;
  /** Delay in ms between retries (default: 100) */
  retryDelayMs?: number;
  /** Whether to filter results matching clipboard content (default: false) */
  filterClipboard?: boolean;
  /**
   * Whether the final retry may still accept a result identical to the clipboard
   * snapshot. Defaults to true for general detection, but panel mode should be
   * stricter because focus changes commonly produce clipboard false positives.
   */
  allowClipboardMatchOnLastAttempt?: boolean;
}

/**
 * Detects available input, prioritizing selected text.
 * Includes a small delay and retry to improve reliability with focus transitions.
 */
export async function detectInput(options?: DetectOptions): Promise<InputResult> {
  let app: Application | undefined;
  try {
    app = await getFrontmostApplication();
  } catch {
    // ignore
  }

  const selected = await tryGetSelectedText(options);
  if (selected) {
    return { text: selected, source: "selected", app };
  }

  return { text: "", source: "none", app };
}

/**
 * Detects input with panel-optimized settings.
 * Panel mode (view mode) requires longer delays and more retries because
 * the Raycast window takes focus away from the source app, making
 * getSelectedText() less reliable during the initial phase.
 */
export async function detectInputForPanel(): Promise<InputResult> {
  return detectInput({
    maxAttempts: 2,
    retryDelayMs: 100,
    filterClipboard: true,
    allowClipboardMatchOnLastAttempt: false,
  });
}

/**
 * Gets the input text, returning empty string if nothing is found.
 */
export async function getInputText(): Promise<string> {
  const { text } = await detectInput();
  return text;
}

async function tryGetSelectedText(options?: DetectOptions): Promise<string | null> {
  const maxAttempts = options?.maxAttempts ?? 2;
  const retryDelayMs = options?.retryDelayMs ?? 100;
  const filterClipboard = options?.filterClipboard ?? false;
  const allowClipboardMatchOnLastAttempt = options?.allowClipboardMatchOnLastAttempt ?? true;

  // Snapshot clipboard content before detection to identify false positives.
  // Some apps/system states may cause getSelectedText() to return the clipboard
  // content instead of the actual selection.
  let clipboardSnapshot: string | undefined;
  if (filterClipboard) {
    try {
      clipboardSnapshot = (await Clipboard.readText())?.trim();
    } catch {
      // ignore
    }
  }

  // Helper to validate a result against the clipboard snapshot
  const isLikelyValid = (text: string): boolean => {
    if (!filterClipboard || !clipboardSnapshot) return true;
    // If the text is identical to clipboard, it might be a false positive.
    // But it could also be legitimately selected text that happens to match clipboard.
    // We only filter on the first few attempts to allow the last attempt to return it.
    return text !== clipboardSnapshot;
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }

    try {
      const text = (await getSelectedText()).trim();
      if (text.length > 0) {
        const isLastAttempt = attempt === maxAttempts - 1;
        const clipboardMatched = !isLikelyValid(text);

        if (!clipboardMatched) {
          return text;
        }

        if (isLastAttempt && allowClipboardMatchOnLastAttempt) {
          return text;
        }

        // Text matches clipboard — treat as a likely false positive and retry.
      }
    } catch {
      // Fall through to retry
    }
  }

  return null;
}
