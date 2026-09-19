import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  type LaunchProps,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  listFileCandidates,
  listInstalledApps,
  SITE_TABLE,
} from "./lib/candidates";
import { isResolved, resolveAction } from "./lib/run";
import { interpret } from "./lib/typesafe";

/** Wait for typing to settle before spending a request on it. */
const DEBOUNCE_MS = 350;

interface AskResult {
  /** The debounced query this result was computed for — stale results are never rendered. */
  query: string;
  action: Awaited<ReturnType<typeof resolveAction>>;
}

async function askJev(query: string): Promise<AskResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const [apps, fileCandidates] = await Promise.all([
    listInstalledApps(),
    listFileCandidates(trimmed),
  ]);

  const interpretation = await interpret(
    trimmed,
    apps.map((app) => app.name),
    fileCandidates.map((f) => f.label),
    Object.keys(SITE_TABLE),
  );

  return {
    query,
    action: await resolveAction(trimmed, interpretation, apps, fileCandidates),
  };
}

export default function Command(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [debouncedText, setDebouncedText] = useState(searchText);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText(searchText), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const trimmedDebounced = debouncedText.trim();
  const { data, isLoading, error } = usePromise(askJev, [debouncedText], {
    execute: trimmedDebounced.length > 0,
  });

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Jev couldn't answer",
        message: String(error),
      });
    }
  }, [error]);

  // usePromise keeps the previous result while a new query loads; only render
  // a result that was actually computed for the current debounced text.
  const current = data && data.query === debouncedText ? data : null;
  const thinking =
    searchText.trim() !== trimmedDebounced ||
    isLoading ||
    (trimmedDebounced.length > 0 && !current && !error);
  const resolved =
    current && isResolved(current.action) ? current.action : null;
  const reason =
    current && !isResolved(current.action) ? current.action.reason : undefined;

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      searchBarPlaceholder='Ask Jev, e.g. "open the pdf i last downloaded"'
    >
      {!searchText.trim() ? (
        <List.EmptyView
          icon={Icon.Wand}
          title="Type what you want Jev to do"
          description='Try "open the pdf i last downloaded", "open notion", or "open github".'
        />
      ) : resolved ? (
        <List.Item
          icon={resolved.icon}
          title={resolved.title}
          subtitle={resolved.subtitle}
          actions={
            <ActionPanel>
              <Action title="Run" icon={Icon.Play} onAction={resolved.run} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.QuestionMark}
          title={
            thinking
              ? "Thinking…"
              : (reason ??
                (error
                  ? "Something went wrong asking Jev"
                  : "Not sure what you mean"))
          }
          description={
            thinking ? undefined : "Try rephrasing, or be more specific."
          }
        />
      )}
    </List>
  );
}
