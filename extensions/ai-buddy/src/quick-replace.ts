import {
  Clipboard,
  closeMainWindow,
  getFrontmostApplication,
  getPreferenceValues,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { clipInput, dataBlock, modelFor, streamChat } from "./llm";
import { cleanOutput, splitLessons } from "./llm-view";
import { LESSONS_MARKER, systemPrompt } from "./prompts";

/**
 * Settings → Buddy Polish English (command setting) → Quick Replace: the hotkey replaces the selected
 * draft right away. Only that command can read it.
 */
export const quickReplaceOn = () => getPreferenceValues<Partial<Preferences.Rewrite>>().quickReplace === true;

/** Reads the answer until the lessons start (not shown here, so not waited for); returns the polished draft. */
export async function readPolished(chunks: AsyncIterable<string>, draft: string): Promise<string> {
  let full = "";
  for await (const chunk of chunks) {
    full += chunk;
    if (full.includes(LESSONS_MARKER)) break;
  }
  return splitLessons(cleanOutput(full, draft)).main;
}

/** The draft needed no fix: same text apart from spacing. */
export const unchanged = (draft: string, polished: string) =>
  draft.replace(/\s+/g, " ").trim() === polished.replace(/\s+/g, " ").trim();

/** Where the draft is: the frontmost app and the selected text. */
async function target(selection?: string): Promise<string> {
  const app = await getFrontmostApplication().catch(() => undefined);
  const selected = selection ?? (await getSelectedText().catch(() => ""));
  return `${app?.bundleId ?? app?.name ?? ""}\n${selected.trim()}`;
}

/**
 * Polishes the selected draft and pastes the result over it (the draft is still selected in the
 * source app). Returns false when it could not, so the caller opens the usual view instead,
 * which shows the error and how to fix it. A draft too long to send whole also goes to that view,
 * where the cut is shown, so its ending is never replaced by a shorter text.
 */
export async function quickReplace(selected: string): Promise<boolean> {
  const { text, clipped } = clipInput(selected);
  if (clipped) return false;
  await closeMainWindow(); // first: when run from Raycast's window, the app with the draft comes back
  const before = await target(selected);
  const toast = await showToast({ style: Toast.Style.Animated, title: "Polishing…" });
  const controller = new AbortController();
  try {
    const stream = streamChat(modelFor("rewrite"), systemPrompt("rewrite"), dataBlock("text", text), controller.signal);
    const polished = await readPolished(stream, text);
    controller.abort(); // the lessons are not needed
    if (!polished) return false;
    await toast.hide();
    // Nothing to fix: leave the chat box (and its undo history) as it is.
    if (unchanged(text, polished)) {
      await showHUD("Already good");
      return true;
    }
    // Pasted only where the draft still is: another app or another selection by now would be
    // overwritten, so the result is copied instead.
    if ((await target()) !== before) {
      await Clipboard.copy(polished);
      await showHUD("Polished and copied: the draft is no longer selected");
      return true;
    }
    await Clipboard.paste(polished);
    await showHUD("Polished");
    return true;
  } catch {
    await toast.hide();
    return false;
  }
}
