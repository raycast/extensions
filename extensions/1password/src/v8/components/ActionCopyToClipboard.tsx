import {
  Action,
  Clipboard,
  Icon,
  Keyboard,
  showToast,
  Toast,
  getPreferenceValues,
  closeMainWindow,
} from "@raycast/api";
import { execFileSync } from "child_process";

import { CLI_PATH, titleCaseWord } from "../utils";

async function copyPassword(password: string): Promise<boolean> {
  const applescript = `
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

  try {
    execFileSync("/usr/bin/osascript", ["-e", applescript, password]);
    return true;
  } catch (error) {
    await Clipboard.copy(password);
    return false;
  }
}

export function CopyToClipboard({
  id,
  vault_id,
  shortcut,
  field = "password",
}: {
  id: string;
  field?: string;
  shortcut: Keyboard.Shortcut;
  vault_id: string;
}) {
  return (
    <Action
      icon={Icon.Clipboard}
      title={`Copy ${titleCaseWord(field)}`}
      shortcut={shortcut}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: `Copying ${field}...`,
        });
        try {
          const stdout = execFileSync(CLI_PATH!, ["read", `op://${vault_id}/${id}/${field}`]);
          await copyPassword(stdout.toString().trim());

          toast.style = Toast.Style.Success;
          toast.title = "Copied to clipboard";
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to copy";
          if (error instanceof Error) {
            toast.message = error.message;
            toast.primaryAction = {
              title: "Copy logs",
              onAction: async (toast) => {
                await Clipboard.copy((error as Error).message);
                toast.hide();
              },
            };
          }
        } finally {
          const preferences = getPreferenceValues();
          if (preferences.closeWindowAfterCopying) {
            await closeMainWindow();
          }
        }
      }}
    />
  );
}
