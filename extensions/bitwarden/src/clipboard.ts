import { runAppleScript } from "./utils";
import { Clipboard } from "@raycast/api";

const APPLESCRIPT_COPY_PASSWORD = `
use AppleScript version "2.4"
use framework "Foundation"
use framework "AppKit"
use scripting additions

property NSPasteboardTypeString : a reference to current application's NSPasteboardTypeString

on run argv
  set textToCopy to item 1 of argv

  set cb to current application's NSPasteboard's generalPasteboard() -- get pasteboard
  cb's clearContents()
  cb's setString:textToCopy forType:"org.nspasteboard.ConcealedType" -- http://nspasteboard.org/
  cb's setString:textToCopy forType:"com.agilebits.onepassword" -- 1Password
  cb's setString:textToCopy forType:NSPasteboardTypeString
end run
`;

/**
 * Copies a password to the system clipboard, setting the appropriate options to conceal it from well-behaved
 * clipboard history software.
 *
 * If this cannot be done (e.g. macOS version < 10.10), it will be copied using the standard clipboard copy mechanism.
 *
 * @param password The password to copy.
 * @return true If copied securely.
 */
export async function copyPassword(password: string): Promise<{ copiedSecurely: boolean }> {
  const result = runAppleScript(APPLESCRIPT_COPY_PASSWORD, [password]);

  try {
    await result;
    return { copiedSecurely: true };
  } catch (ex) {
    await Clipboard.copy(password);
    return { copiedSecurely: false };
  }
}
