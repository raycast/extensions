import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  findMostRecentAttentionThread,
  type CodexAttentionThread,
  openThread,
} from "./lib/codex";

type View = {
  err?: string;
  item?: CodexAttentionThread | null;
  loading: boolean;
};

function itemTitle(item: CodexAttentionThread) {
  return item.title?.trim() || item.threadId;
}

function itemTag(item: CodexAttentionThread) {
  switch (item.matchReason) {
    case "waitingOnUserInput":
      return "Waiting on You";
    case "waitingOnApproval":
      return "Waiting on Approval";
    default:
      return "Most Recent";
  }
}

export default function Command() {
  const [view, set] = useState<View>({ loading: true });

  const load = useCallback(async () => {
    set({ loading: true });

    try {
      const item = await findMostRecentAttentionThread();
      if (!item) {
        set({ item: null, loading: false });
        return;
      }

      await openThread(item.threadId);
      set({ item, loading: false });
    } catch (err) {
      set({
        err: err instanceof Error ? err.message : String(err),
        item: null,
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (view.err) {
    return (
      <List
        isLoading={view.loading}
        searchBarPlaceholder="Codex attention threads unavailable"
      >
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Codex attention threads not available"
          description={view.err}
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={() => void load()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={view.loading}
      searchBarPlaceholder="Opening the latest Codex attention thread..."
    >
      {!view.loading && !view.item ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Codex threads found"
          description="Codex did not return any non-archived threads to open."
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={() => void load()}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {view.item ? (
        <List.Item
          id={view.item.threadId}
          title={itemTitle(view.item)}
          subtitle={view.item.cwd || view.item.threadId}
          accessories={[{ tag: itemTag(view.item) }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Thread in Codex"
                icon={Icon.Terminal}
                onAction={async () => {
                  if (!view.item) return;
                  await openThread(view.item.threadId);
                }}
              />
              <Action.CopyToClipboard
                title="Copy Thread ID"
                content={view.item.threadId}
              />
              {view.item.cwd ? (
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={view.item.cwd}
                />
              ) : null}
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={() => void load()}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
