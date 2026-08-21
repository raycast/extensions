import { spawn } from "node:child_process";

export const CONCEALED_PASTEBOARD_SCRIPT = `
ObjC.import("AppKit");

const input = $.NSFileHandle.fileHandleWithStandardInput.readDataToEndOfFile;
const value = $.NSString.alloc.initWithDataEncoding(input, $.NSUTF8StringEncoding);
if (!value) {
  throw new Error("Unable to decode clipboard content");
}

const item = $.NSPasteboardItem.alloc.init;
item.setStringForType(value, $.NSPasteboardTypeString);
item.setStringForType("", "org.nspasteboard.ConcealedType");
item.setStringForType("", "org.nspasteboard.TransientType");

const pasteboard = $.NSPasteboard.generalPasteboard;
pasteboard.clearContents;
if (!pasteboard.writeObjects($.NSArray.arrayWithObject(item))) {
  throw new Error("Unable to write clipboard content");
}
`;

export type ConcealedClipboardWriter = (content: string) => Promise<void>;

async function writeConcealedPasteboard(content: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("/usr/bin/osascript", ["-l", "JavaScript", "-e", CONCEALED_PASTEBOARD_SCRIPT], {
      stdio: ["pipe", "ignore", "ignore"],
    });
    let settled = false;

    const fail = () => {
      if (settled) return;
      settled = true;
      reject(new Error("Unable to copy confidential data without saving it to Clipboard History"));
    };

    child.once("error", fail);
    child.stdin.once("error", fail);
    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      if (code === 0) {
        resolve();
      } else {
        reject(new Error("Unable to copy confidential data without saving it to Clipboard History"));
      }
    });

    child.stdin.end(content, "utf8");
  });
}

export async function copyConcealedToClipboard(
  content: string,
  writer: ConcealedClipboardWriter = writeConcealedPasteboard,
): Promise<void> {
  await writer(content);
}
