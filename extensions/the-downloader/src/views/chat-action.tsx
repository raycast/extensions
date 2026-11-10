import { Action, Icon, Keyboard, LaunchType, Toast, launchCommand, showToast } from "@raycast/api";

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
      onAction={() =>
        launchCommand({ name: "chat-link", type: LaunchType.UserInitiated, context: { url } }).catch((error) =>
          showToast({
            style: Toast.Style.Failure,
            title: "Couldn't open Chat About Link",
            message: error instanceof Error ? error.message : String(error),
          }),
        )
      }
    />
  );
}
