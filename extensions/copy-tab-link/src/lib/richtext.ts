import { spawn } from "node:child_process";
import { Clipboard } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export type RichTextMethod = "auto" | "rtf" | "html";

function isMac(): boolean {
  return process.platform === "darwin";
}

/**
 * A bare `<a href>` is ignored by a surprising number of apps. Microsoft Teams,
 * Outlook and Word only recognise the link once it arrives as a complete HTML
 * document, so every rich text payload gets wrapped.
 */
export function htmlDocument(inner: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${inner}</body></html>`;
}

function run(command: string, args: string[], input?: string | Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    const out: Buffer[] = [];
    const err: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(out));
      } else {
        reject(new Error(Buffer.concat(err).toString().trim() || `${command} exited with ${code}`));
      }
    });

    if (input !== undefined) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

/**
 * Puts RTF, HTML and plain text on the pasteboard in one go, through
 * JavaScript for Automation. Every app then picks the flavour it understands:
 * Teams, Outlook and Word take the RTF, browsers and Notion take the HTML,
 * and a plain text field still gets a readable URL instead of RTF markup.
 */
const JXA_SET_CLIPBOARD = `ObjC.import('AppKit');

function run(argv) {
  var html = argv[0];
  var plain = argv[1];

  var pasteboard = $.NSPasteboard.generalPasteboard;
  pasteboard.clearContents;

  var htmlData = $.NSString.alloc.initWithUTF8String(html).dataUsingEncoding($.NSUTF8StringEncoding);
  var attributed = $.NSAttributedString.alloc.initWithHTMLDocumentAttributes(htmlData, $());
  if (!attributed || attributed.length === 0) {
    throw new Error('Could not convert the HTML into rich text.');
  }

  var rtf = attributed.RTFFromRangeDocumentAttributes($.NSMakeRange(0, attributed.length), $());
  if (!rtf) {
    throw new Error('Could not produce RTF.');
  }

  pasteboard.setDataForType(rtf, 'public.rtf');
  pasteboard.setStringForType(html, 'public.html');
  pasteboard.setStringForType(plain, 'public.utf8-plain-text');

  return 'ok';
}`;

async function copyEverything(html: string, plain: string): Promise<void> {
  const result = await runAppleScript(JXA_SET_CLIPBOARD, [html, plain], {
    language: "JavaScript",
    timeout: 15_000,
  });
  if (result.trim() !== "ok") {
    throw new Error("The clipboard script did not confirm.");
  }
}

/** The classic route: textutil turns HTML into RTF, pbcopy puts it on the pasteboard. */
async function copyRtfOnly(html: string): Promise<void> {
  const rtf = await run("textutil", ["-stdin", "-format", "html", "-convert", "rtf", "-stdout"], html);
  if (rtf.length === 0) {
    throw new Error("textutil returned nothing.");
  }
  await run("pbcopy", [], rtf);
}

export interface RichTextResult {
  /** Which route actually succeeded, for the confirmation message. */
  method: "rtf+html" | "rtf" | "html";
}

export async function copyRichText(html: string, plain: string, method: RichTextMethod): Promise<RichTextResult> {
  if (!isMac() || method === "html") {
    await Clipboard.copy({ html, text: plain });
    return { method: "html" };
  }

  if (method === "rtf") {
    await copyRtfOnly(html);
    return { method: "rtf" };
  }

  // "auto": the richest option first, then the two proven fallbacks.
  try {
    await copyEverything(html, plain);
    return { method: "rtf+html" };
  } catch {
    try {
      await copyRtfOnly(html);
      return { method: "rtf" };
    } catch {
      await Clipboard.copy({ html, text: plain });
      return { method: "html" };
    }
  }
}

/** Pastes whatever is on the clipboard into the app that is now in front. */
export async function pasteClipboard(): Promise<void> {
  if (!isMac()) {
    return;
  }
  await runAppleScript('tell application "System Events" to keystroke "v" using command down', {
    timeout: 10_000,
  });
}
