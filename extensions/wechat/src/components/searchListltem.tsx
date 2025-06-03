import { Action, ActionPanel, closeMainWindow, environment, Icon, List, showToast, Toast } from "@raycast/api";
import path from "path";
import { storageService } from "../services/storageService";
import { wechatService } from "../services/wechatService";
import GenerateMessageForm from "../tools/generateMessageForm";
import { SearchListItemProps } from "../types";

export function SearchListItem({ searchResult, isPinned, onTogglePin, onClearHistory }: SearchListItemProps) {
  const defaultAvatarPath = path.join(environment.assetsPath, "avatar.png");

  async function startWeChat() {
    try {
      await wechatService.startChat(searchResult.arg);
      await storageService.addRecentContact(searchResult);
      await closeMainWindow({ clearRootSearch: true });
    } catch (error) {
      console.error("Failed to open WeChat chat:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open WeChat chat",
        message: String(error),
      });
    }
  }

  const title = searchResult.title || searchResult.subtitle || searchResult.arg;
  const avatarPath = searchResult.icon.path || defaultAvatarPath;

  return (
    <List.Item
      title={title}
      accessories={[
        {
          text: searchResult.arg,
          icon: isPinned ? { source: Icon.Pin } : undefined,
        },
      ]}
      icon={avatarPath}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action icon={Icon.Message} title="Chat" onAction={startWeChat} />
            <Action.Push
              title="Generate AI Message"
              icon={Icon.Wand}
              target={<GenerateMessageForm contactName={title} contactId={searchResult.arg} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              title="Copy WeChat ID"
              content={searchResult.arg}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              title={isPinned ? "Unpin Contact" : "Pin Contact"}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={onTogglePin}
            />
            <Action
              icon={Icon.Trash}
              title="Clear Search History"
              onAction={onClearHistory}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
