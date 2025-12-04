import { Action, ActionPanel, closeMainWindow, environment, Icon, List, showToast, Toast } from "@raycast/api";
import path from "path";
import { storageService } from "../services/storageService";
import { wechatService } from "../services/wechatService";
import { SearchResult } from "../types";

interface SearchListItemProps {
  searchResult: SearchResult;
  isPinned: boolean;
  onTogglePin: () => void;
  onClearHistory: () => void;
}

export function SearchListItem({ searchResult, isPinned, onTogglePin, onClearHistory }: SearchListItemProps) {
  const defaultAvatarPath = path.join(environment.assetsPath, "avatar.png");

  async function startWeChat() {
    try {
      await wechatService.startChat(searchResult.arg);
      await storageService.addRecentContact(searchResult);
      await closeMainWindow({ clearRootSearch: true });
    } catch (error) {
      console.error("Failed to open WeChat chat:", error);
      showToast({
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
      // subtitle={searchResult.subtitle}
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
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              title="Copy Wechat Id"
              content={searchResult.arg}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              title="Copy Quick Access URL"
              content={searchResult.url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              title={isPinned ? "Unpin Contact" : "Pin Contact"}
              onAction={onTogglePin}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
            <Action
              icon={Icon.Trash}
              title="Clear Search History"
              onAction={onClearHistory}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            />
            <Action.OpenInBrowser
              title="Feature Request"
              url="https://github.com/raffeyang/wechat"
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
