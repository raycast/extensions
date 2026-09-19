import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { SessionMeta, listRecentSessions } from "./lib/claudescope";
import { agentTag, ErrorView, formatCost, formatDate, formatTokens, openWithFeedback } from "./lib/ui";

interface SessionsState {
  sessions: SessionMeta[];
  error?: Error;
  loading: boolean;
}

export default function Command() {
  const [generation, setGeneration] = useState(0);
  const [state, setState] = useState<SessionsState>({ sessions: [], loading: true });

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setState((previous) => ({ ...previous, error: undefined, loading: true }));
    listRecentSessions(controller.signal)
      .then((sessions) => {
        if (current) setState({ sessions, loading: false });
      })
      .catch((error: unknown) => {
        if (current && !controller.signal.aborted) {
          setState({ sessions: [], error: error instanceof Error ? error : new Error(String(error)), loading: false });
        }
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [generation]);

  return (
    <List isLoading={state.loading} searchBarPlaceholder="Filter recent sessions…">
      {state.error ? (
        <ErrorView error={state.error} retry={() => setGeneration((value) => value + 1)} />
      ) : state.sessions.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Indexed Sessions"
          description="Open ClaudeScope to check source detection and indexing status."
          actions={
            <ActionPanel>
              <Action title="Open ClaudeScope" icon={Icon.AppWindow} onAction={() => openWithFeedback()} />
            </ActionPanel>
          }
        />
      ) : (
        state.sessions.map((session) => (
          <List.Item
            key={session.id}
            icon={Icon.Terminal}
            title={session.title || "Untitled Session"}
            subtitle={session.projectDisplayName}
            keywords={[session.id, session.projectId, session.connectorId]}
            accessories={[
              { tag: agentTag(session.connectorId) },
              { text: formatDate(session.startedAt), tooltip: "Started" },
              {
                text: `${formatTokens(session.totalTokens)} · ${formatCost(session.totalCostUsd)}`,
                tooltip: `${session.messageCount} messages`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Open Session in ClaudeScope"
                  icon={Icon.ArrowRight}
                  onAction={() => openWithFeedback(session.id)}
                />
                <Action.CopyToClipboard title="Copy Session ID" content={session.id} />
                <Action
                  title="Open ClaudeScope"
                  icon={Icon.AppWindow}
                  shortcut={Keyboard.Shortcut.Common.OpenWith}
                  onAction={() => openWithFeedback()}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
