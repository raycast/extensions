import { Clipboard, Toast, getSelectedText, showToast } from "@raycast/api";

const RTL_EMBEDDING_START = "\u202B";
const RTL_EMBEDDING_END = "\u202C";
const RTL_MARK = "\u200F";

function wrapWithRtlEmbedding(text: string): string {
  return `${RTL_EMBEDDING_START}${RTL_MARK}${text}${RTL_EMBEDDING_END}`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildRtlHtml(text: string): string {
  const htmlLines = text.split(/\r?\n/).map((line) => {
    const safeLine = escapeHtml(line) || "&nbsp;";
    return `<div style="direction: rtl; text-align: right; unicode-bidi: plaintext; display: block; width: 100%;">&rlm;${safeLine}</div>`;
  });

  return `<div dir="rtl" style="direction: rtl; text-align: right; unicode-bidi: isolate; display: block; width: 100%;">${htmlLines.join("")}</div>`;
}

async function getInputText(): Promise<string | undefined> {
  try {
    const selectedText = await getSelectedText();
    if (selectedText.trim()) {
      return selectedText;
    }
  } catch {
    // No selected text available in the active app.
  }

  const clipboardText = await Clipboard.readText();
  if (clipboardText?.trim()) {
    return clipboardText;
  }

  return undefined;
}

export default async function Command() {
  try {
    const inputText = await getInputText();

    if (!inputText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text found",
        message: "Select some text or copy text to the clipboard first.",
      });
      return;
    }

    await Clipboard.paste({
      html: buildRtlHtml(inputText),
      text: wrapWithRtlEmbedding(inputText),
    });

    await showToast({
      style: Toast.Style.Success,
      title: "RTL content pasted",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to transform text",
      message:
        error instanceof Error ? error.message : "An unknown error occurred.",
    });
  }
}
