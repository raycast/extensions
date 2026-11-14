import { getShortcuts } from "../shortcut-settings";
/**
 * Opened explicitly from duplicate feedback while preserving the source form.
 * The ordinary bookmark actions allow inspecting or editing an existing item.
 */
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findSaved, type SavedHit } from "../helpers/duplicates";
import { toBookmark } from "../helpers/me";
import { useCollections } from "../hooks/useCollections";
import { session } from "../session";
import BookmarkItem from "./BookmarkItem";
import EditBookmark from "./EditBookmark";
import { TrashBookmarkActions } from "./TrashBookmarkActions";

export default function AlreadySaved({ links }: { links: string[] }) {
  const { push } = useNavigation();
  const { data: collections } = useCollections();
  const [hits, setHits] = useState<SavedHit[]>();
  const [error, setError] = useState<Error>();
  const key = JSON.stringify(links);
  const controller = useRef<AbortController | undefined>(undefined);

  const load = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setError(undefined);
    try {
      const active = await session();
      const next = await findSaved(active, JSON.parse(key) as string[], current.signal);
      if (!current.signal.aborted) setHits(next);
    } catch (cause) {
      if (!current.signal.aborted) setError(cause instanceof Error ? cause : new Error(String(cause)));
      throw cause;
    }
  }, [key]);

  useEffect(() => {
    setHits(undefined);
    void load().catch(() => {});
    return () => controller.current?.abort();
  }, [load]);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const collection of collections?.items ?? []) map.set(collection._id, collection.title);
    return map;
  }, [collections]);

  return (
    <List isLoading={!hits && !error} navigationTitle="Already Saved" searchBarPlaceholder="Already in your library">
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.Bookmark}
        title={error ? "Cannot check the library" : hits ? "No bookmarks match these links" : "Checking the library"}
        description={
          error
            ? error.message
            : hits
              ? "The URL may have changed, or the entry moved to Trash. This list now has no matching bookmarks."
              : "Looking for an existing bookmark of this page."
        }
        actions={
          <ActionPanel>
            <TrashBookmarkActions revalidate={load} />
            <Action
              title="Check Again"
              shortcut={getShortcuts().shortcutRefresh}
              icon={Icon.ArrowClockwise}
              onAction={() => load().catch(() => {})}
            />
          </ActionPanel>
        }
      />
      {hits && hits.length > 0 && (
        <List.Section
          title={error ? "Refresh failed · Showing previous results" : "Already in your library"}
          subtitle={
            error?.message ?? `Nothing new was created · ${hits.length} ${hits.length === 1 ? "bookmark" : "bookmarks"}`
          }
        >
          {hits.map(({ entity }) => (
            <BookmarkItem
              key={entity.id}
              bookmark={toBookmark(entity, names)}
              revalidate={load}
              onEdit={(id, refresh) =>
                push(
                  <EditBookmark
                    id={id}
                    revalidate={refresh}
                    onViewExisting={(next) => push(<AlreadySaved links={next} />)}
                  />,
                )
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
