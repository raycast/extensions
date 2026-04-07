import { Clipboard, closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";

/**
 * Detects if text contains a URL that was broken across multiple lines
 * (e.g., copied from a terminal, email, or narrow viewport).
 */
function containsBrokenURL(text: string): boolean {
  if (!text.includes("\n") && !text.includes("\r")) return false;
  const joined = text.replace(/[\r\n]+\s*/g, "");
  return /^https?:\/\/\S+/.test(joined) || /^[\w-]+:\/\/\S+/.test(joined);
}

/**
 * Joins a broken URL: strips line breaks, trailing/leading whitespace per line,
 * and any spaces introduced by word-wrap.
 */
function joinBrokenURL(text: string): string {
  return text
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .join("");
}

export default async function Command() {
  try {
    const clipboard = await Clipboard.readText();

    if (!clipboard || !clipboard.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
        message: "Copy a broken URL first",
      });
      return;
    }

    const raw = clipboard.trim();

    if (!containsBrokenURL(raw)) {
      // Maybe it's a single-line URL with stray spaces
      const cleaned = raw.replace(/\s+/g, "");
      if (/^https?:\/\/\S+/.test(cleaned) && cleaned !== raw) {
        await Clipboard.copy(cleaned);
        await closeMainWindow();
        await showHUD("URL cleaned and copied");
        return;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "No broken URL detected",
        message: "Clipboard doesn't contain a split URL",
      });
      return;
    }

    const fixed = joinBrokenURL(raw);
    await Clipboard.copy(fixed);
    await closeMainWindow();
    await showHUD("URL fixed and copied");
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to fix URL" });
  }
}
