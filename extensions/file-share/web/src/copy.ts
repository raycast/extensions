/**
 * Copying the clipboard from a page served over plain `http://<lan-ip>` runs into a browser rule: the async
 * Clipboard API only exists in a secure context (https, or localhost), so on the address this page is reached
 * by, `navigator.clipboard` is simply undefined. The old `document.execCommand("copy")` still works from a
 * real user gesture, so that is the path that runs here.
 *
 * Returns whether the text made it into the clipboard, or whether it was only selected on screen for the user
 * to copy by hand (Safari refuses the trick in some situations).
 */
export type CopyResult = "copied" | "selected";

export async function copyText(text: string, element?: HTMLElement | null): Promise<CopyResult> {
  if (text === "") return "copied";

  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      // Permission refused (or the document is not focused) — fall through to the legacy path.
    }
  }

  if (legacyCopy(text)) return "copied";

  // Last resort: leave the text selected so a single ⌘C / Ctrl+C finishes the job.
  if (element) selectContents(element);
  return "selected";
}

/**
 * Tries the two shapes browsers accept, in order: Safari wants a range inside an editable element, while
 * Chrome and Firefox want a focused text field with its own selection. Both elements stay on screen but
 * invisible — parking them off-screen is what makes Safari refuse the copy.
 */
function legacyCopy(text: string): boolean {
  const selection = window.getSelection();
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  const holder = document.createElement("div");
  holder.setAttribute("aria-hidden", "true");
  holder.contentEditable = "true";
  holder.textContent = text;
  holder.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;overflow:hidden;opacity:0;white-space:pre-wrap;";
  document.body.appendChild(holder);

  const range = document.createRange();
  range.selectNodeContents(holder);
  selection?.removeAllRanges();
  selection?.addRange(range);

  let copied = execCopy();

  if (!copied) {
    const area = document.createElement("textarea");
    area.setAttribute("aria-hidden", "true");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText =
      "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;outline:0;box-shadow:none;background:transparent;opacity:0;";
    document.body.appendChild(area);
    area.focus({ preventScroll: true });
    area.select();
    area.setSelectionRange(0, text.length);
    copied = execCopy();
    area.remove();
  }

  holder.remove();
  selection?.removeAllRanges();
  if (previous && selection) selection.addRange(previous);
  return copied;
}

function execCopy(): boolean {
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  }
}

function selectContents(element: HTMLElement): void {
  // Form controls ignore ranges: they need focus plus their own selection.
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    element.focus({ preventScroll: true });
    element.select();
    return;
  }
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
