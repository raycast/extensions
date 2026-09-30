import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import type { StoredSession } from "../stored-sessions";
import { historyListPreview } from "../stored-sessions";
import { historyDetailMarkdown } from "./markdown";

const EMPTY_DETAIL_MARKDOWN = `### No sessions yet

When you finish **Read My Screen** or **Analyze Image File**, the conversation is saved so you can reopen it here.

- **Open** a row to continue the chat or copy the last reply  
- **Delete** entries you no longer need`;

type HistorySessionsListProps = {
  sessions: StoredSession[];
  onRestore: (s: StoredSession) => void;
  onDelete: (id: string) => void;
  /** List-level actions (e.g. Back to setup in the main command). */
  headerActions?: ReactNode;
  /** Adds a Back action on each row when embedded in the main command. */
  onBackFromHistory?: () => void;
};

export function HistorySessionsList({
  sessions,
  onRestore,
  onDelete,
  headerActions,
  onBackFromHistory,
}: HistorySessionsListProps) {
  const empty = sessions.length === 0;

  return (
    <List
      navigationTitle="Session history"
      searchBarPlaceholder="Search sessions"
      isShowingDetail
      actions={headerActions}
    >
      <List.Section title="Recent" subtitle={empty ? "Nothing saved yet" : `${sessions.length} saved`}>
        {empty ? (
          <List.Item
            icon={Icon.Clock}
            title="No saved sessions"
            subtitle="Run an analysis — successful chats appear here."
            detail={<List.Item.Detail markdown={EMPTY_DETAIL_MARKDOWN} />}
            actions={
              onBackFromHistory ? (
                <ActionPanel>
                  <Action title="Back" icon={Icon.ArrowLeft} onAction={onBackFromHistory} />
                </ActionPanel>
              ) : undefined
            }
          />
        ) : (
          sessions.map((s) => (
            <List.Item
              key={s.id}
              id={s.id}
              icon={s.source === "browser" ? Icon.Globe : Icon.Image}
              title={s.title}
              subtitle={historyListPreview(s)}
              detail={<List.Item.Detail markdown={historyDetailMarkdown(s)} />}
              accessories={[
                { text: new Date(s.createdAt).toLocaleString() },
                { text: s.source === "browser" ? "Browser" : "Screen" },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Open" icon={Icon.ArrowRight} onAction={() => onRestore(s)} />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => void onDelete(s.id)}
                  />
                  {onBackFromHistory ? (
                    <Action title="Back" icon={Icon.ArrowLeft} onAction={onBackFromHistory} />
                  ) : null}
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
