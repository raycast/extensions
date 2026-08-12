import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { SearchHit, searchTranscripts } from "./lib/claudescope";
import { ErrorView, clip, openWithFeedback } from "./lib/ui";

const MINIMUM_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 350;

interface SearchState {
  hits: SearchHit[];
  error?: Error;
  loading: boolean;
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [generation, setGeneration] = useState(0);
  const [state, setState] = useState<SearchState>({ hits: [], loading: false });

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < MINIMUM_QUERY_LENGTH) {
      setState({ hits: [], loading: false });
      return;
    }

    const controller = new AbortController();
    let current = true;
    setState((previous) => ({ ...previous, error: undefined, loading: true }));
    const timer = setTimeout(() => {
      searchTranscripts(normalizedQuery, controller.signal)
        .then((hits) => {
          if (current) setState({ hits, loading: false });
        })
        .catch((error: unknown) => {
          if (current && !controller.signal.aborted) {
            setState({ hits: [], error: error instanceof Error ? error : new Error(String(error)), loading: false });
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      current = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, generation]);

  const emptyTitle = query.trim().length < MINIMUM_QUERY_LENGTH ? "Search Transcript History" : "No Transcript Matches";
  const emptyDescription =
    query.trim().length < MINIMUM_QUERY_LENGTH
      ? "Type at least two characters to search locally indexed sessions."
      : "Try a different phrase or check whether ClaudeScope has finished indexing.";

  return (
    <List
      isLoading={state.loading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search local transcript history…"
      throttle={false}
    >
      {state.error ? (
        <ErrorView error={state.error} retry={() => setGeneration((value) => value + 1)} />
      ) : state.hits.length === 0 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title={emptyTitle} description={emptyDescription} />
      ) : (
        state.hits.map((hit) => (
          <List.Item
            key={`${hit.sessionId}:${hit.messageUuid}`}
            icon={Icon.Message}
            title={hit.title || "Untitled Session"}
            subtitle={clip(hit.snippet)}
            accessories={[{ text: hit.projectDisplayName }, { tag: hit.role }]}
            actions={
              <ActionPanel>
                <Action
                  title="Open Message in ClaudeScope"
                  icon={Icon.ArrowRight}
                  onAction={() => openWithFeedback(hit.sessionId, hit.messageUuid)}
                />
                <Action.CopyToClipboard title="Copy Snippet" content={hit.snippet} />
                <Action.CopyToClipboard title="Copy Session ID" content={hit.sessionId} />
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
