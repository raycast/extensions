import { t } from "./i18n";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useRef, useState } from "react";
import {
  conversationTitle,
  messageOf,
  type StoredConversation,
} from "./conversations";

export type Page = "chat" | "recent";

/** A short switcher for this extension's chats, not a global Codex thread manager. */
export function useSessionHistory({
  page,
  sessions,
  activeId,
  onSelect,
  onBack,
  onNew,
}: {
  page: Page;
  sessions: StoredConversation[];
  activeId: string | null;
  onSelect: (session: StoredConversation) => Promise<void>;
  onBack: () => void;
  onNew: () => Promise<void>;
}): List.Props {
  const openingRef = useRef(false);
  const [opening, setOpening] = useState(false);
  const recent =
    page === "chat"
      ? []
      : [...sessions]
          .filter(
            (session) =>
              !session.archived &&
              session.threadId &&
              (session.messages.length || session.draft),
          )
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
          .slice(0, 12);

  async function select(session: StoredConversation) {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    try {
      await onSelect(session);
    } catch (reason) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("Could not continue conversation"),
        message: messageOf(reason),
      });
    } finally {
      openingRef.current = false;
      setOpening(false);
    }
  }

  return {
    navigationTitle: t("Recent Chats"),
    searchBarPlaceholder: t("Select a recent conversation…"),
    filtering: true,
    isLoading: opening,
    isShowingDetail: false,
    actions: (
      <ActionPanel>
        <Action
          title={t("Back to Chat")}
          icon={Icon.ArrowLeft}
          onAction={onBack}
        />
        <Action title={t("New Chat")} icon={Icon.Plus} onAction={onNew} />
      </ActionPanel>
    ),
    children: (
      <>
        <List.EmptyView
          icon={Icon.Message}
          title={t("No recent conversations")}
          description={t("Go back and enter a question to get started.")}
        />
        {recent.map((session) => (
          <List.Item
            key={session.threadId!}
            id={session.threadId!}
            title={conversationTitle(session)}
            icon={session.threadId === activeId ? Icon.Message : Icon.Clock}
            accessories={
              session.updatedAt ? [{ date: new Date(session.updatedAt) }] : []
            }
            actions={
              <ActionPanel>
                <Action
                  title={t("Continue Conversation")}
                  icon={Icon.Message}
                  onAction={() => select(session)}
                />
                <Action
                  title={t("Back to Chat")}
                  icon={Icon.ArrowLeft}
                  onAction={onBack}
                />
                <Action
                  title={t("New Chat")}
                  icon={Icon.Plus}
                  onAction={onNew}
                />
              </ActionPanel>
            }
          />
        ))}
      </>
    ),
  };
}
