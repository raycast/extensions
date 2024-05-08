import { Toast, showHUD, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function main() {
  try {
    const messageSubject = await runAppleScript(`
    tell application "Mail"
      set _msg to item 1 of (get selection)
      set _messageURL to "message://%3c" & _msg's message id & "%3e"
      set _msgSubject to subject of _msg
      set _from to sender of _msg
      set _name to extract name from _from
      set theLink to ("[" & _msgSubject & "](" & _messageURL & ")" & " from " & _name as string)
      set the clipboard to theLink
      return _msgSubject
    end tell`);

    await showHUD(messageSubject);
  } catch (error) {
    await showToast({
      title: "Error",
      message: "Failed to get the message subject",
      style: Toast.Style.Failure,
    });
  }
}
