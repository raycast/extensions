import { List, ActionPanel, Action, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { ArcSession } from "../types";
import { getArcSessions, isArcNotEntitledError } from "../api";
import { ArcSessionDetail } from "./arc-session-detail";
import { ArcNotEntitledView } from "./arc-not-entitled";

export function ArcSessionList() {
  const [sessions, setSessions] = useState<ArcSession[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [notEntitled, setNotEntitled] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions(cursor?: string) {
    try {
      setIsLoading(true);
      const response = await getArcSessions({ cursor, limit: 100, sort: "-created_at" });
      setSessions((current) => (cursor ? [...current, ...(response.data || [])] : response.data || []));
      setNextCursor(response.meta?.next_cursor || undefined);
    } catch (error) {
      if (isArcNotEntitledError(error)) {
        setNotEntitled(true);
      } else {
        console.error("Error loading sessions:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load sessions",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (notEntitled) {
    return <ArcNotEntitledView />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sessions by key, provider, or model...">
      {sessions.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Sessions Found"
          description="No AI Runtime Control sessions have been logged yet."
          icon={Icon.Message}
        />
      ) : (
        <>
          {sessions.map((session) => (
            <List.Item
              key={session.id}
              title={session.virtual_key_name || session.id}
              subtitle={session.provider && session.model ? `${session.provider}/${session.model}` : session.model}
              keywords={[session.provider, session.model, session.id].filter((keyword): keyword is string => !!keyword)}
              icon={Icon.Message}
              accessories={[
                { text: `${session.requests ?? 0} req`, tooltip: "Requests" },
                {
                  text: `${(session.input_tokens ?? 0).toLocaleString()} in / ${(session.output_tokens ?? 0).toLocaleString()} out`,
                  tooltip: "Input / output tokens",
                },
                { date: new Date(session.created_at), tooltip: new Date(session.created_at).toLocaleString() },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="View Session" icon={Icon.Eye} target={<ArcSessionDetail session={session} />} />
                  <Action.CopyToClipboard
                    title="Copy Session ID"
                    content={session.id}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "c" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                    }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => loadSessions()}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel>
              }
            />
          ))}
          {nextCursor && (
            <List.Item
              key="load-more"
              title="Load More Sessions…"
              icon={Icon.Ellipsis}
              actions={
                <ActionPanel>
                  <Action title="Load More" icon={Icon.Ellipsis} onAction={() => loadSessions(nextCursor)} />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}
