import { Action, ActionPanel, Icon, Keyboard, List, open, showToast, Toast } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useState } from "react";
import { useSelectionDetail } from "./hooks/use-selection-detail";
import { exportMarkdown, exportName, getTurns, searchSessions, type Turn } from "./lib/history";
import { escapeMarkdown, saveMarkdownToDownloads } from "./lib/markdown";
import { copyError } from "./lib/copy-error";
import { appToStart, OsaurusNotFoundError } from "./lib/osaurus";

export default function Command() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useCachedState<boolean>("show-detail-history", true);
  const { data: sessions, isLoading, error } = usePromise(searchSessions, [query]);
  const { value: turns, error: turnsError, isLoading: isLoadingTurns } = useSelectionDetail(selected, getTurns);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!!sessions?.length && showDetail}
      filtering={false}
      throttle
      onSearchTextChange={setQuery}
      onSelectionChange={setSelected}
      searchBarPlaceholder="Search chats…"
    >
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Couldn't read your Osaurus history" description={error.message} />
      ) : (
        <List.EmptyView
          icon={Icon.Message}
          title={query ? "No matching chats" : "No chats yet"}
          description={query ? "Try a different word." : "Chats you have in Osaurus show up here."}
        />
      )}
      {sessions?.map((s) => (
        <List.Item
          key={s.id}
          id={s.id}
          title={s.title}
          icon={s.pinned ? Icon.Tack : Icon.Message}
          accessories={[{ date: new Date(s.updated_at * 1000) }]}
          detail={
            <List.Item.Detail
              isLoading={selected === s.id && isLoadingTurns}
              markdown={
                selected !== s.id
                  ? undefined
                  : turnsError
                    ? `Couldn't load this chat: ${turnsError.message}`
                    : turns && toMarkdown(turns)
              }
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Model" text={s.selected_model ?? "—"} />
                  <List.Item.Detail.Metadata.Label title="Messages" text={String(s.turn_count)} />
                  <List.Item.Detail.Metadata.Label
                    title="Started"
                    text={new Date(s.created_at * 1000).toLocaleString()}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              {turns && (
                <>
                  <Action.CopyToClipboard title="Copy Conversation as Markdown" content={exportMarkdown(s, turns)} />
                  <Action
                    title="Export Conversation as Markdown"
                    icon={Icon.SaveDocument}
                    shortcut={Keyboard.Shortcut.Common.Save}
                    onAction={() => saveMarkdownToDownloads(exportName(s), exportMarkdown(s, turns), "conversation")}
                  />
                </>
              )}
              <Action
                title="Open Osaurus"
                icon={Icon.AppWindow}
                shortcut={Keyboard.Shortcut.Common.Open}
                // The Osaurus you run. Osaurus has no link to a specific chat, and a bare osaurus:// opens pairing.
                onAction={async () => {
                  const app = await appToStart();
                  if (app) await open(app);
                  else
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Couldn't find Osaurus",
                      primaryAction: copyError(new OsaurusNotFoundError()),
                    });
                }}
              />
              <Action
                title={showDetail ? "Hide Sidebar" : "Show Sidebar"}
                icon={Icon.AppWindowSidebarRight}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "d" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                }}
                onAction={() => setShowDetail((v) => !v)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function toMarkdown(turns: Turn[]): string {
  return (
    turns
      .filter((t) => (t.role === "user" || t.role === "assistant") && t.content?.trim())
      // Your prompts show literally, as in Ask; the model's replies render as Markdown.
      .map(
        (t) =>
          `**${t.role === "user" ? "You" : "Assistant"}**\n\n${t.role === "user" ? escapeMarkdown(t.content ?? "") : t.content}`,
      )
      .join("\n\n---\n\n")
  );
}
