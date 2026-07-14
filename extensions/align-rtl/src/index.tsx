import {
  Clipboard,
  Toast,
  closeMainWindow,
  getSelectedText,
  showToast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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

async function writeNativeHtmlClipboard(html: string, text: string) {
  const { stdout } = await execFileAsync("/usr/bin/osascript", [
    "-l",
    "JavaScript",
    "-e",
    `
ObjC.import("AppKit");

function run(argv) {
  const html = argv[0];
  const text = argv[1];
  const pasteboard = $.NSPasteboard.generalPasteboard;
  const htmlData = $(html).dataUsingEncoding($.NSUTF8StringEncoding);

  pasteboard.clearContents();
  pasteboard.setDataForType(htmlData, $("public.html"));
  pasteboard.setStringForType($(text), $("public.utf8-plain-text"));
  pasteboard.setStringForType($(text), $("NSStringPboardType"));

  return ObjC.deepUnwrap(pasteboard.types).join("\\n");
}
`,
    "--",
    html,
    text,
  ]);

  if (!stdout.includes("public.html")) {
    throw new Error("Unable to write HTML to the macOS pasteboard.");
  }
}

async function pasteWithSystemShortcut() {
  await closeMainWindow({ clearRootSearch: true });
  await setTimeout(100);
  await execFileAsync("/usr/bin/osascript", [
    "-e",
    'tell application "System Events" to keystroke "v" using command down',
  ]);
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

    await writeNativeHtmlClipboard(
      buildRtlHtml(inputText),
      wrapWithRtlEmbedding(inputText),
    );
    await pasteWithSystemShortcut();

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
