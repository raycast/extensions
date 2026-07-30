import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";

import { PromptDetail } from "./components/PromptDetail.js";
import { RaycastSnapshotCache } from "./lib/cache.js";
import { MINIMUM_PROMPTTY_VERSION } from "./lib/compatibility.js";
import { emptyStateCopy, SnapshotError } from "./lib/errors.js";
import { resolveSnapshotPath } from "./lib/paths.js";
import { applyPrimaryOrdering, comparePromptFallback, promptFrecencyKey, searchPrompts } from "./lib/search.js";
import { isSnapshotStale, loadSnapshotWithCache, type LoadedSnapshot } from "./lib/snapshot.js";
import type { PromptRecord } from "./types/snapshot.js";

interface CommandState {
  isLoading: boolean;
  loaded?: LoadedSnapshot;
  error?: SnapshotError;
}

const snapshotCache = new RaycastSnapshotCache();
const PROMPTTY_APP_STORE_URL = "https://apps.apple.com/us/app/promptty/id6751414013";

export default function SearchPrompttyCommand() {
  const preferences = getPreferenceValues<Preferences.SearchPromptty>();
  const snapshotPath = resolveSnapshotPath(preferences.snapshotFile);
  const [searchText, setSearchText] = useState("");
  const [state, setState] = useState<CommandState>({ isLoading: true });

  useEffect(() => {
    let cancelled = false;
    setState({ isLoading: true });
    loadSnapshotWithCache(snapshotPath, snapshotCache)
      .then((loaded) => {
        if (!cancelled) setState({ isLoading: false, loaded });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          isLoading: false,
          error:
            error instanceof SnapshotError
              ? error
              : new SnapshotError("unavailable", "The Promptty snapshot could not be loaded."),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [snapshotPath]);

  const filteredPrompts = useMemo(
    () => searchPrompts(state.loaded?.snapshot.prompts ?? [], searchText),
    [searchText, state.loaded?.snapshot.prompts],
  );
  const { data: frecencySortedPrompts, visitItem } = useFrecencySorting(filteredPrompts, {
    namespace: "promptty-prompts-v1",
    key: promptFrecencyKey,
    sortUnvisited: comparePromptFallback,
  });
  const displayedPrompts = useMemo(
    () => applyPrimaryOrdering(frecencySortedPrompts, searchText),
    [frecencySortedPrompts, searchText],
  );

  const emptyCopy = getEmptyCopy(state);
  const warning = state.loaded ? warningText(state.loaded) : undefined;

  return (
    <List
      filtering={false}
      isLoading={state.isLoading}
      isShowingDetail
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search prompts…"
      throttle
    >
      {!state.isLoading && displayedPrompts.length === 0 ? (
        <List.EmptyView
          icon={Icon.Text}
          title={emptyCopy.title}
          description={emptyCopy.description}
          actions={emptyStateActions(state)}
        />
      ) : (
        <List.Section title={warning}>
          {displayedPrompts.map((prompt) => (
            <PromptItem key={prompt.id} prompt={prompt} onVisit={() => visitItem(prompt)} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function PromptItem({ prompt, onVisit }: { prompt: PromptRecord; onVisit: () => Promise<void> }) {
  return (
    <List.Item
      title={prompt.title}
      accessories={prompt.isFavorite ? [{ icon: Icon.Star, tooltip: "Favorite" }] : []}
      detail={<PromptDetail prompt={prompt} />}
      actions={
        <ActionPanel>
          <Action.Paste title="Paste Prompt" content={prompt.content} onPaste={onVisit} />
          <Action.CopyToClipboard title="Copy Prompt" content={prompt.content} onCopy={onVisit} />
        </ActionPanel>
      }
    />
  );
}

function getEmptyCopy(state: CommandState): { title: string; description: string } {
  if (state.error) return emptyStateCopy(state.error);
  if (state.loaded?.snapshot.prompts.length === 0) {
    return {
      title: "No Prompts Yet",
      description: "Create your first prompt in Promptty.",
    };
  }
  return {
    title: "No Matching Prompts",
    description: "Try a different search.",
  };
}

function emptyStateActions(state: CommandState) {
  if (state.error?.kind !== "missing" && state.error?.kind !== "unsupportedPrompttyVersion") {
    return undefined;
  }
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title={`Update Promptty to ${MINIMUM_PROMPTTY_VERSION}+`}
        url={PROMPTTY_APP_STORE_URL}
        icon={Icon.Download}
      />
    </ActionPanel>
  );
}

function warningText(loaded: LoadedSnapshot): string | undefined {
  const parts: string[] = [];
  if (loaded.source === "cache") {
    parts.push(cacheFallbackWarning(loaded.issue));
  }
  if (isSnapshotStale(loaded.snapshot.generatedAt)) {
    parts.push(`Last exported ${formatRelativeDate(loaded.snapshot.generatedAt)}`);
  }
  if (loaded.skippedRecordCount > 0) {
    parts.push(
      `${loaded.skippedRecordCount} invalid ${loaded.skippedRecordCount === 1 ? "record" : "records"} skipped`,
    );
  }
  if (!loaded.cacheUpdated && loaded.source === "file") {
    parts.push("Snapshot is too large for fallback cache");
  }
  return parts.length > 0 ? parts.join(" • ") : undefined;
}

function cacheFallbackWarning(issue: SnapshotError | undefined): string {
  switch (issue?.kind) {
    case "permission":
      return "Current export is not accessible; showing last-known-good local snapshot";
    case "incompatible":
      return "Update this extension for the current export; showing last-known-good local snapshot";
    case "unsupportedPrompttyVersion":
      return "Update Promptty for Mac to use this extension";
    case "malformed":
      return "Current export is invalid; showing last-known-good local snapshot";
    case "missing":
      return "Current export is missing; showing last-known-good local snapshot";
    case "unavailable":
    case undefined:
      return "Current export is unavailable; showing last-known-good local snapshot";
  }
}

function formatRelativeDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
