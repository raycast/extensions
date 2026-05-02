import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useState, useMemo, useCallback, useEffect } from "react";
import { isNavigableDirectory } from "$lib/item-behavior";
import type { AppliedItemUpdate } from "$lib/pages/item-edit/types";
import { useDirectoryItems, useFinderTags, createItem, copyItem, moveItem } from "$lib/ray-fb";
import type { Item } from "$lib/types";
import { useSessionView, SessionViewProvider } from "./session-view-context";
import { ItemBrowserPresenter } from "../shared/item-browser";
import type { DirectoryBrowserProps } from "./types";

export function DirectoryBrowser({
  path,
  gridColumns,
  enabledAccessories,
  enterAction,
  onPathVisited,
}: DirectoryBrowserProps) {
  const { view, sort, setView, setSort } = useSessionView();
  const [optimisticOverrides, setOptimisticOverrides] = useState<Map<string, Partial<Item>>>(new Map());
  const [optimisticRemovedPaths, setOptimisticRemovedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    onPathVisited?.(path);
  }, [path, onPathVisited]);

  const { data, isLoading, error, revalidate } = useDirectoryItems(
    path ? { path, sort, showHidden: enabledAccessories.showHidden } : undefined,
  );
  const { data: tagCatalog } = useFinderTags();

  const entries = data;

  useEffect(() => {
    const entryPaths = new Set(entries.map((entry) => entry.path));

    setOptimisticRemovedPaths((prev) => {
      const next = new Set([...prev].filter((removedPath) => entryPaths.has(removedPath)));
      return next.size === prev.size ? prev : next;
    });

    setOptimisticOverrides((prev) => {
      const next = new Map([...prev].filter(([entryPath]) => entryPaths.has(entryPath)));
      return next.size === prev.size ? prev : next;
    });
  }, [entries]);

  const mergedEntries = useMemo(() => {
    const visibleEntries =
      optimisticRemovedPaths.size === 0 ? entries : entries.filter((entry) => !optimisticRemovedPaths.has(entry.path));

    if (optimisticOverrides.size === 0) return visibleEntries;
    return visibleEntries.map((entry) => {
      const override = optimisticOverrides.get(entry.path);
      if (!override) return entry;
      return { ...entry, ...override } as Item;
    });
  }, [entries, optimisticOverrides, optimisticRemovedPaths]);

  const folders = mergedEntries.filter((entry) => isNavigableDirectory(entry));
  const handleApplied = useCallback(
    (update: AppliedItemUpdate) => {
      setOptimisticOverrides((prev) => {
        const next = new Map(prev);
        const patch = {
          path: update.path,
          name: update.name,
          finderComment: update.finderComment,
          userTags: update.userTags,
        };
        next.set(update.previousPath, { ...next.get(update.previousPath), ...patch });
        return next;
      });
      setOptimisticRemovedPaths((prev) => {
        if (!prev.has(update.previousPath)) return prev;
        const next = new Set(prev);
        next.delete(update.previousPath);
        return next;
      });
      revalidate?.();
    },
    [revalidate],
  );

  const handleRemoveItems = useCallback(
    (removedPaths: string[]) => {
      setOptimisticRemovedPaths((prev) => {
        const next = new Set(prev);
        for (const removedPath of removedPaths) {
          next.add(removedPath);
        }
        return next;
      });
      revalidate?.();
    },
    [revalidate],
  );

  const handleCreateFolder = useCallback(
    async (name: string) => {
      try {
        await createItem({ directoryPath: path, name });
        revalidate?.();
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Create Folder",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [path, revalidate],
  );

  const handleCopyItem = useCallback(
    async (itemPath: string, dest: string) => {
      try {
        await copyItem({ sourcePath: itemPath, destinationPath: dest });
        revalidate?.();
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Copy Item",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [revalidate],
  );

  const handleMoveItem = useCallback(
    async (itemPath: string, dest: string) => {
      try {
        await moveItem({ sourcePath: itemPath, destinationPath: dest });
        handleRemoveItems([itemPath]);
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Move Item",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [handleRemoveItems],
  );

  const createDirectoryTarget = useCallback(
    (dirPath: string) => (
      <SessionViewProvider initialView={view} initialSort={sort}>
        <DirectoryBrowser
          path={dirPath}
          initialView={view}
          initialSort={sort}
          gridColumns={gridColumns}
          enabledAccessories={enabledAccessories}
          enterAction={enterAction}
          onPathVisited={onPathVisited}
        />
      </SessionViewProvider>
    ),
    [view, sort, gridColumns, enabledAccessories, enterAction, onPathVisited],
  );

  const createItemActionCallbacks = useCallback(
    (entry: Item) => ({
      onApplied: handleApplied,
      onCreateFolder: handleCreateFolder,
      onCopyItem: async (dest: string) => handleCopyItem(entry.path, dest),
      onMoveItem: async (dest: string) => handleMoveItem(entry.path, dest),
      onTrashItems: handleRemoveItems,
      siblingDirectories: folders,
      revalidate,
    }),
    [folders, handleApplied, handleCreateFolder, handleCopyItem, handleMoveItem, handleRemoveItems, revalidate],
  );

  if (error) {
    return <Detail markdown={`## ray-fb items list failed\n\n\`${error.message}\``} />;
  }

  return (
    <ItemBrowserPresenter
      items={mergedEntries}
      view={view}
      onViewChange={setView}
      sort={sort}
      onSortChange={setSort}
      gridColumns={gridColumns}
      enabledAccessories={enabledAccessories}
      enterAction={enterAction}
      isLoading={isLoading}
      pathLabel={path}
      tagCatalog={tagCatalog}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => revalidate?.()}
          />
        </ActionPanel>
      }
      createDirectoryTarget={createDirectoryTarget}
      createItemActionCallbacks={createItemActionCallbacks}
    />
  );
}
