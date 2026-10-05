import { useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  getApplications,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { useFrecencySorting, usePromise } from "@raycast/utils";

import { PromptDetail } from "./components/PromptDetail.js";
import { RaycastSnapshotCache } from "./lib/cache.js";
import { emptyStateCopy, SnapshotError } from "./lib/errors.js";
import { resolveSnapshotPath } from "./lib/paths.js";
import { applyPrimaryOrdering, comparePromptFallback, promptFrecencyKey, searchPrompts } from "./lib/search.js";
import { isSnapshotStale, loadSnapshotWithCache, type LoadedSnapshot } from "./lib/snapshot.js";
import type { PromptRecord } from "./types/snapshot.js";

interface SearchPrompttyPreferences {
  snapshotFile?: string | string[];
}

const snapshotCache = new RaycastSnapshotCache();
const PROMPTTY_APP_STORE_URL = "https://apps.apple.com/us/app/promptty/id6751414013";
const PROMPTTY_BUNDLE_ID = "codes.kos.Promptty";
const PROMPTTY_APP_NAME = "Promptty";

async function loadSnapshot(path: string): Promise<LoadedSnapshot> {
  return loadSnapshotWithCache(path, snapshotCache);
}

export default function SearchPrompttyCommand() {
  const preferences = getPreferenceValues<SearchPrompttyPreferences>();
  const snapshotPath = resolveSnapshotPath(preferences.snapshotFile);
  const [searchText, setSearchText] = useState("");
  const {
    data: loaded,
    isLoading,
    error,
    revalidate,
  } = usePromise(loadSnapshot, [snapshotPath], {
    onError() {
      // Expected snapshot states are shown in List.EmptyView instead of a toast.
    },
  });
  const snapshotError = error ? snapshotErrorFromUnknown(error) : undefined;

  const filteredPrompts = useMemo(
    () => searchPrompts(loaded?.snapshot.prompts ?? [], searchText),
    [searchText, loaded?.snapshot.prompts],
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

  const emptyCopy = getEmptyCopy(snapshotError, loaded);
  const warning = loaded ? warningText(loaded) : undefined;
  const isEmptyLibrary = Boolean(loaded && loaded.snapshot.prompts.length === 0);

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search prompts…"
      throttle
    >
      {!isLoading && displayedPrompts.length === 0 ? (
        <List.EmptyView
          icon={Icon.Text}
          title={emptyCopy.title}
          description={emptyCopy.description}
          actions={emptyStateActions(snapshotError, isEmptyLibrary, revalidate)}
        />
      ) : (
        <List.Section title={warning}>
          {displayedPrompts.map((prompt) => (
            <PromptItem key={prompt.id} prompt={prompt} onReload={revalidate} onVisit={() => visitItem(prompt)} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function PromptItem({
  prompt,
  onReload,
  onVisit,
}: {
  prompt: PromptRecord;
  onReload: () => void;
  onVisit: () => Promise<void>;
}) {
  return (
    <List.Item
      title={prompt.title}
      accessories={prompt.isFavorite ? [{ icon: Icon.Star, tooltip: "Favorite" }] : []}
      detail={<PromptDetail prompt={prompt} />}
      actions={
        <ActionPanel>
          <Action.Paste title="Paste Prompt" content={prompt.content} onPaste={onVisit} />
          <Action.CopyToClipboard title="Copy Prompt" content={prompt.content} onCopy={onVisit} />
          <ActionPanel.Section>
            <Action
              title="Reload Snapshot"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onReload}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getEmptyCopy(
  error: SnapshotError | undefined,
  loaded: LoadedSnapshot | undefined,
): {
  title: string;
  description: string;
} {
  if (error) return emptyStateCopy(error);
  if (loaded?.snapshot.prompts.length === 0) {
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

function emptyStateActions(error: SnapshotError | undefined, isEmptyLibrary: boolean, revalidate: () => void) {
  if (!error && !isEmptyLibrary) {
    return undefined;
  }

  return (
    <ActionPanel>
      {error ? errorActions(error) : <Action title="Open Promptty" icon={Icon.AppWindow} onAction={openPromptty} />}
      <Action
        title="Reload Snapshot"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </ActionPanel>
  );
}

function errorActions(error: SnapshotError) {
  const openPrompttyAction = <Action title="Open Promptty" icon={Icon.AppWindow} onAction={openPromptty} />;
  const updatePrompttyAction = (
    <Action.OpenInBrowser title="Update Promptty" url={PROMPTTY_APP_STORE_URL} icon={Icon.Download} />
  );

  switch (error.kind) {
    case "missing":
      return (
        <ActionPanel.Section>
          {openPrompttyAction}
          {updatePrompttyAction}
        </ActionPanel.Section>
      );
    case "unsupportedPrompttyVersion":
      return (
        <ActionPanel.Section>
          {updatePrompttyAction}
          {openPrompttyAction}
        </ActionPanel.Section>
      );
    case "permission":
      return (
        <ActionPanel.Section>
          <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
          {openPrompttyAction}
        </ActionPanel.Section>
      );
    case "malformed":
    case "unavailable":
    case "incompatible":
      return <ActionPanel.Section>{openPrompttyAction}</ActionPanel.Section>;
    default: {
      const _exhaustive: never = error.kind;
      return _exhaustive;
    }
  }
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
  const kind = issue?.kind;
  switch (kind) {
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
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function formatRelativeDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function snapshotErrorFromUnknown(error: unknown): SnapshotError {
  if (error instanceof SnapshotError) return error;
  return new SnapshotError("unavailable", "The Promptty snapshot could not be loaded.");
}

async function openPromptty(): Promise<void> {
  const applications = await getApplications();
  const promptty = applications.find(
    (application) => application.bundleId === PROMPTTY_BUNDLE_ID || application.name === PROMPTTY_APP_NAME,
  );
  await open(promptty?.path ?? PROMPTTY_APP_STORE_URL);
}
