import { isDownloadRunning } from "../lib/download-session.js";
import { Action, Alert, Icon, Keyboard, LaunchType, Toast, confirmAlert, launchCommand, showToast } from "@raycast/api";

/** Opens Chat About Link from the form, the preview, the live view and the history. */
export const CHAT_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "a" },
  Windows: { modifiers: ["ctrl", "shift"], key: "a" },
};

/**
 * Chat About Link for `url`, opened as its own command rather than pushed on
 * top of the current one: the chat's settings (engine, models, transcript
 * language, images) live on that command, and only it can read them.
 */
export function ChatAboutLinkAction({ url }: { url: string }) {
  return (
    <Action
      title="Chat About Link"
      icon={Icon.SpeechBubbleActive}
      shortcut={CHAT_SHORTCUT}
      onAction={async () => {
        // The chat replaces this command, and closing it stops what it runs.
        if (
          isDownloadRunning() &&
          !(await confirmAlert({
            title: "Stop the Download?",
            message: "Chat About Link opens in place of this command, which stops the download that's running.",
            icon: Icon.SpeechBubbleActive,
            primaryAction: { title: "Stop and Open Chat", style: Alert.ActionStyle.Destructive },
            dismissAction: { title: "Keep Downloading" },
          }))
        )
          return;
        await launchCommand({ name: "chat-link", type: LaunchType.UserInitiated, context: { url } }).catch((error) =>
          showToast({
            style: Toast.Style.Failure,
            title: "Couldn't open Chat About Link",
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      }}
    />
  );
}
