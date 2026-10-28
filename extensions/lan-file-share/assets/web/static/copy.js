/**
 * Copying the clipboard from a page served over plain `http://<lan-ip>` runs into a browser rule: the async
 * Clipboard API only exists in a secure context (https, or localhost), so on the address this page is reached
 * by, `navigator.clipboard` is simply undefined. The old `document.execCommand("copy")` still works from a
 * real user gesture, so that is the path that runs here.
 *
 * Modal `<dialog showModal()>` is another trap: temporary nodes appended to `document.body` sit outside the
 * top layer, and many browsers then refuse `execCommand("copy")`. Mount the temporary nodes inside the open
 * dialog (or the preview element) instead.
 *
 * Returns whether the text made it into the clipboard, or whether it was only selected on screen for the user
 * to copy by hand (Safari refuses the trick in some situations).
 */
export async function copyText(text, element) {
  if (text == null || text === "") return "selected";

  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      // Permission refused (or the document is not focused) — fall through to the legacy path.
    }
  }

  const mount = copyMount(element);
  if (legacyCopy(text, mount)) return "copied";

  // Prefer the concrete text node (e.g. <pre>) over a wrapper that may include chrome.
  const selectable = element?.querySelector?.("pre, textarea, input") || element;
  if (selectable) selectContents(selectable);
  return "selected";
}

/** Prefer the open dialog top-layer; fall back to body. */
function copyMount(element) {
  if (element instanceof Element) {
    const dialog = element.closest("dialog");
    if (dialog?.open) return dialog;
  }
  return document.querySelector("dialog[open]") || document.body;
}

function legacyCopy(text, mount) {
  const selection = window.getSelection();
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  const holder = document.createElement("div");
  holder.setAttribute("aria-hidden", "true");
  holder.contentEditable = "true";
  holder.textContent = text;
  holder.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;overflow:hidden;opacity:0;white-space:pre-wrap;";
  mount.appendChild(holder);

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
    mount.appendChild(area);
    area.focus({ preventScroll: true });
    area.select();
    area.setSelectionRange(0, text.length);
    copied = execCopy();
    area.remove();
  }

  holder.remove();
  selection?.removeAllRanges();
  if (previous && selection) {
    try {
      selection.addRange(previous);
    } catch {
      // Previous range may belong to a node that was removed.
    }
  }
  return copied;
}

function execCopy() {
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  }
}

function selectContents(element) {
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
