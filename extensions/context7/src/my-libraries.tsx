import { Action, ActionPanel, Alert, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";

import { LibraryListItem } from "./components/library-list-item";
import { Context7ApiError } from "./lib/context7";
import { showErrorToast, toErrorMessage } from "./lib/error-utils";
import { loadLibraryDocs } from "./lib/library-docs";
import { buildCapturedAccessory, buildLibraryAccessories } from "./lib/library-format";
import { readCachedAt } from "./lib/library-cache";
import { clearMyLibraries, getMyLibraries, pruneOrphanedCaches } from "./lib/my-libraries";
import { countOf, toTimestamp } from "./lib/text";
import type { SavedLibrary } from "./lib/types";

type SortOption = "frecency" | "alphabetical" | "recent" | "trustScore" | "snippets";

/**
 * Context7 showed no burst limiting — six concurrent requests all returned 200, each costing
 * exactly one unit of the monthly quota, so parallelism is free in quota terms. Bounded anyway:
 * an undiscovered limit is likelier than an unbounded fan-out being worth it, and four keeps a
 * large library list quick without hammering.
 */
const REFRESH_CONCURRENCY = 4;

/** Runs `worker` over `items`, at most `limit` in flight. Resolves once every item settles. */
async function mapWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  const queue = [...items];

  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      await worker(next);
    }
  });

  await Promise.all(runners);
}

export default function MyLibrariesCommand() {
  const [libraries, setLibraries] = useState<SavedLibrary[]>([]);
  /** Cache freshness read from the files themselves, keyed by library id. */
  const [cachedAt, setCachedAt] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<SortOption>("frecency");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void refresh();
  }, []);

  const {
    data: frecencySorted,
    visitItem,
    resetRanking,
  } = useFrecencySorting(libraries, {
    namespace: "my-libraries",
    key: (library) => library.id,
  });

  const sortedLibraries = useMemo(() => {
    const sorted = [...(sortBy === "frecency" ? frecencySorted : libraries)];

    switch (sortBy) {
      case "alphabetical":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "recent":
        sorted.sort((a, b) => toTimestamp(b.addedAt) - toTimestamp(a.addedAt));
        break;
      case "trustScore":
        sorted.sort((a, b) => (b.trustScore ?? 0) - (a.trustScore ?? 0));
        break;
      case "snippets":
        sorted.sort((a, b) => (b.totalSnippets ?? 0) - (a.totalSnippets ?? 0));
        break;
      case "frecency":
      default:
        break;
    }

    return sorted;
  }, [sortBy, frecencySorted, libraries]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter my libraries..."
      searchBarAccessory={
        <List.Dropdown tooltip="Sort By" value={sortBy} storeValue onChange={(value) => setSortBy(value as SortOption)}>
          <List.Dropdown.Item title="Smart Sort" value="frecency" />
          <List.Dropdown.Item title="Alphabetical" value="alphabetical" />
          <List.Dropdown.Item title="Recently Added" value="recent" />
          <List.Dropdown.Item title="Trust Score" value="trustScore" />
          <List.Dropdown.Item title="Most Snippets" value="snippets" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Star}
        title="No Saved Libraries"
        description="Add a library from Search Libraries and its documentation is kept here for instant search."
      />

      {sortedLibraries.length > 0 && (
        <List.Section title="My Libraries" subtitle={sortedLibraries.length.toString()}>
          {sortedLibraries.map((library) => (
            <LibraryListItem
              key={library.id}
              library={library}
              isSaved={true}
              onSavedChange={refresh}
              accessories={buildAccessories(library, sortBy, cachedAt[library.id])}
              onVisit={() => visitItem(library)}
              extraActions={
                <ActionPanel.Section>
                  <Action
                    title="Refresh Library"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => handleRefreshLibrary(library)}
                  />
                  <Action
                    title="Refresh All Libraries"
                    icon={Icon.ArrowClockwise}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "r" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "r" },
                    }}
                    onAction={handleRefreshAll}
                  />
                  <Action
                    title="Remove All Libraries"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={handleRemoveAll}
                  />
                </ActionPanel.Section>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );

  async function refresh() {
    setIsLoading(true);

    try {
      const saved = await getMyLibraries();
      setLibraries(saved);

      const freshness = await Promise.all(
        saved.map(async (library) => [library.id, await readCachedAt(library.id)] as const),
      );
      setCachedAt(Object.fromEntries(freshness.filter(([, at]) => at)) as Record<string, string>);

      // Self-heals payloads orphaned by a removal that raced an in-flight refresh. This reads
      // the manifest again under its lock, since `saved` can be stale by the time we prune.
      await pruneOrphanedCaches();
    } catch (error) {
      await showErrorToast("Could Not Load My Libraries", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefreshLibrary(library: SavedLibrary) {
    // Fired before the request, so the list never sits silently during a multi-second fetch.
    const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing", message: library.name });

    try {
      const docs = await loadLibraryDocs(library.id, { isSaved: true, forceRefresh: true });
      await refresh();

      toast.style = Toast.Style.Success;
      toast.title = "Refreshed";
      toast.message = `${library.name} — ${countOf(docs.snippets.length, "snippet")}`;
    } catch (error) {
      await toast.hide();
      await showErrorToast("Could Not Refresh Library", error);
    }
  }

  async function handleRefreshAll() {
    let saved: SavedLibrary[];

    try {
      saved = await getMyLibraries();
    } catch (error) {
      await showErrorToast("Could Not Load My Libraries", error);
      return;
    }

    if (saved.length === 0) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing Libraries",
      message: `0 of ${saved.length}`,
    });

    const failures: string[] = [];
    let completed = 0;
    let rateLimited = false;

    await mapWithConcurrency(saved, REFRESH_CONCURRENCY, async (library) => {
      // A 429 means back off, not push harder — skip the rest rather than finish the queue.
      if (rateLimited) {
        return;
      }

      try {
        await loadLibraryDocs(library.id, { isSaved: true, forceRefresh: true });
      } catch (error) {
        if (error instanceof Context7ApiError && error.status === 429) {
          rateLimited = true;
        }

        failures.push(`${library.name}: ${toErrorMessage(error)}`);
      } finally {
        // Counted on completion, not by index — with parallel work they finish out of order.
        completed += 1;
        toast.message = `${completed} of ${saved.length} — ${library.name}`;
      }
    });

    await refresh();

    if (failures.length === 0) {
      toast.style = Toast.Style.Success;
      toast.title = "Refreshed All Libraries";
      toast.message = countOf(saved.length, "library");
      return;
    }

    await toast.hide();
    await showErrorToast(
      rateLimited ? "Stopped at the Context7 Rate Limit" : `Refreshed with ${countOf(failures.length, "failure")}`,
      new Error(failures.join("\n")),
    );
  }

  async function handleRemoveAll() {
    const confirmed = await confirmAlert({
      title: "Remove All Libraries?",
      message: `This removes ${countOf(libraries.length, "library")} and their cached documentation. Saved snippets are kept.`,
      icon: Icon.Trash,
      primaryAction: { title: "Remove All", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    try {
      // Before clearing: resetRanking needs the items, and they are gone afterwards.
      await Promise.all(libraries.map((library) => resetRanking(library).catch(() => undefined)));
      setLibraries(await clearMyLibraries());
      setCachedAt({});
      await showToast({ style: Toast.Style.Success, title: "Removed All Libraries" });
    } catch (error) {
      await showErrorToast("Could Not Remove Libraries", error);
    }
  }
}

function buildAccessories(library: SavedLibrary, sortBy: SortOption, cachedAt?: string): List.Item.Accessory[] {
  const captured = buildCapturedAccessory(cachedAt, "Documentation captured");

  if (sortBy === "recent") {
    const added = buildCapturedAccessory(library.addedAt ?? library.favoritedAt, "Added to My Libraries");
    return added ? [added] : buildLibraryAccessories(library);
  }

  return captured ? [...buildLibraryAccessories(library).slice(0, 2), captured] : buildLibraryAccessories(library);
}
