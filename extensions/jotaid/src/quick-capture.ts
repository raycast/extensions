import { Clipboard, closeMainWindow, getFrontmostApplication, getSelectedText, showHUD } from "@raycast/api";
import { frontmostPage } from "./lib/browser";
import { clipNoteURL, openInBackground } from "./lib/deeplink";

/**
 * Whatever the user is looking at, in one keystroke.
 *
 * The selection is what people mean by "save this"; the clipboard is the fallback for the
 * places macOS will not hand a selection over (a PDF viewer, a terminal, a web app that
 * draws its own text). Reaching for the clipboard silently is better than an error telling
 * someone to go and select the text they can plainly see.
 */
interface Capture {
  text: string;
  /** Which of the two it came from — the confirmation says so, see below. */
  source: "selection" | "clipboard";
}

async function readCapture(): Promise<Capture | undefined> {
  try {
    const selection = await getSelectedText();
    if (selection.trim().length > 0) {
      return { text: selection, source: "selection" };
    }
  } catch {
    // No selection available from the frontmost app — fall through to the clipboard.
    // Reading a selection also needs Accessibility permission; without it this is the
    // path every capture takes.
  }
  const clipboard = await Clipboard.readText();
  return clipboard === undefined ? undefined : { text: clipboard, source: "clipboard" };
}

export default async function Command() {
  // The frontmost app has to be read before the main window closes, or Raycast itself
  // becomes the answer. Jotaid uses the bundle identifier to hand the foreground back.
  const frontmost = await getFrontmostApplication().catch(() => undefined);

  const capture = await readCapture();
  if (capture === undefined || capture.text.trim().length === 0) {
    await showHUD("Nothing to capture");
    return;
  }

  // When the capture came from a browser, the page itself is the source worth recording —
  // "Google Chrome" says nothing a month later, the article's title and link say everything.
  const page = await frontmostPage(frontmost?.name);

  await closeMainWindow();
  await openInBackground(
    clipNoteURL({
      text: capture.text,
      sourceTitle: page?.title,
      sourceURL: page?.url,
      sourceApp: frontmost?.name,
      sourceBundleID: frontmost?.bundleId,
    }),
  );

  // Naming the source is worth the extra word: a capture that quietly saved the clipboard
  // when you meant to save your selection is otherwise indistinguishable from one that
  // worked, and the usual cause — no Accessibility permission — gives no other clue.
  await showHUD(capture.source === "selection" ? "Saved selection to Jotaid" : "Saved clipboard to Jotaid");
}
