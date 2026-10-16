import { Clipboard, getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { runClaudeJson } from "./claude";
import { NoInputError, showErrorHUD } from "./errors";
import { addHistory, historyFromUsage } from "./history";
import { selectionMessage } from "./prompts";
import { settings } from "./settings";
import { preserveWhitespace } from "./text";
import { recordUsage } from "./usage";

export interface Input {
  text: string;
  source: "selection" | "clipboard";
  /** The user's clipboard before we touched it, restored after pasting. */
  saved?: Clipboard.Content;
}

/** Text and rich-text clipboards can be put back; files and images are left alone. */
async function snapshotClipboard(): Promise<Clipboard.Content | undefined> {
  try {
    const { text, html } = await Clipboard.read();
    if (html) return { html, text };
    if (text) return { text };
  } catch {
    // Unreadable clipboard: nothing to restore.
  }
  return undefined;
}

/**
 * The selected text, or the clipboard when nothing is selected (if allowed). The source is
 * kept so a clipboard-based result is copied back instead of pasted into an empty spot.
 * The clipboard is saved first: getSelectedText may fall back to a synthetic ⌘C.
 */
export async function readInput(clipboardFallback: boolean): Promise<Input> {
  const saved = await snapshotClipboard();
  try {
    const text = await getSelectedText();
    if (text.trim()) return { text, source: "selection", saved };
  } catch {
    // Nothing selected, or Raycast has no accessibility access to the frontmost app.
  }
  if (clipboardFallback) {
    const text = await Clipboard.readText();
    if (text?.trim()) return { text, source: "clipboard" };
  }
  throw new NoInputError();
}

/**
 * Puts the user's clipboard back. After a paste, waits so the target app reads the pasted text
 * first. Without a paste it still runs, because getSelectedText may have copied the selection.
 */
export async function restoreClipboard(input: Input | undefined, afterPaste: boolean): Promise<void> {
  if (!input?.saved || input.source !== "selection") return;
  if (afterPaste) await new Promise((resolve) => setTimeout(resolve, 600));
  const current = await Clipboard.readText().catch(() => undefined);
  if (!afterPaste && current === ("text" in input.saved ? input.saved.text : undefined)) return;
  await Clipboard.copy(input.saved, { concealed: true });
}

/**
 * Pastes over the selection (then restores the clipboard), or copies when the input came from
 * the clipboard. Call `closeMainWindow()` first from a view command.
 */
export async function deliver(input: Input, output: string): Promise<"pasted" | "copied"> {
  if (input.source === "selection") {
    await Clipboard.paste(output);
    return "pasted";
  }
  await Clipboard.copy(output);
  return "copied";
}

export interface QuickTask<T extends { text: string }> {
  /** Command name from package.json (history filter and icon). */
  command: string;
  title: string;
  progress: string;
  system: string;
  schema: Record<string, unknown>;
  /** HUD text after a successful replacement. */
  done: (data: T, changed: boolean) => string;
  /** Skip pasting when the result equals the input (nothing to fix). */
  skipUnchanged?: boolean;
}

/** Selection → Claude (structured output) → paste back, with progress toast and HUD. */
export async function runQuickTask<T extends { text: string }>(task: QuickTask<T>): Promise<void> {
  const s = settings();
  let toast: Toast | undefined;
  let input: Input | undefined;
  try {
    input = await readInput(s.clipboardFallback);
    toast = await showToast({ style: Toast.Style.Animated, title: task.progress });
    const { data, response } = await runClaudeJson<T>({
      apiKey: s.apiKey,
      model: s.quickModel,
      effort: "low",
      system: task.system,
      schema: task.schema,
      messages: [{ role: "user", content: selectionMessage(input.text) }],
    });
    const output = preserveWhitespace(input.text, data.text);
    const changed = output !== input.text;

    await recordUsage(response.usage);
    if (s.keepHistory) {
      await addHistory(historyFromUsage(task.command, task.title, input.text, output, response.usage));
    }

    if (!changed && task.skipUnchanged) {
      await toast.hide();
      await showHUD(task.done(data, false));
      await restoreClipboard(input, false);
      return;
    }
    const how = await deliver(input, output);
    await toast.hide();
    await showHUD(how === "copied" ? `${task.done(data, changed)} · copied to clipboard` : task.done(data, changed));
    await restoreClipboard(input, how === "pasted");
  } catch (error) {
    await toast?.hide();
    await showErrorHUD(error);
    await restoreClipboard(input, false);
  }
}
