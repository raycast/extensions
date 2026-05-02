import { Action, ActionPanel, Grid, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useMemo, useCallback } from "react";
import { Contents, type ContentsSortMode, type ContentsViewMode } from "$lib/components/contents";
import type { ContentsSection } from "$lib/components/contents/types";
import { useFinderTags, useTagItems, copyItem, moveItem } from "$lib/ray-fb";
import { isNavigableDirectory } from "$lib/item-behavior";
import { resolveSymlink } from "$lib/symlink-resolve";
import { DirectoryBrowser } from "$lib/pages/directory-browser";
import { ItemDetail } from "$lib/pages/item-detail";
import { ItemEdit } from "$lib/pages/item-edit";
import type { FinderTag } from "$lib/types";
import { buildFinderTagView } from "./finder-tags";
import { buildTagBrowserState } from "./state";
import type { TagBrowserState } from "./state";
import type { TagBrowserProps } from "./types";

type TagContentsProps = TagBrowserProps & {
  tagName: string;
  tagCatalog: FinderTag[];
};

function TagContents({
  tagName,
  initialView,
  initialSort,
  gridColumns,
  enabledAccessories,
  enterAction,
  tagCatalog,
}: TagContentsProps) {
  const [view, setView] = useState<ContentsViewMode>(initialView);
  const [sort, setSort] = useState<ContentsSortMode>(initialSort);

  const {
    data: tagItems,
    isLoading: itemsLoading,
    error: itemsError,
    revalidate: revalidateTagItems,
  } = useTagItems({ name: tagName, sort, showHidden: enabledAccessories.showHidden });

  const state: TagBrowserState = {
    phase: itemsLoading ? "loading-items" : "ready",
    tags: null,
    selectedTag: tagName,
    items: itemsError ? null : tagItems,
    tagListError: false,
    tagQueryError: !!itemsError,
  };

  const viewState = buildTagBrowserState(state);

  const handleEditApplied = useCallback(() => {
    revalidateTagItems();
  }, [revalidateTagItems]);

  const handleCopyItem = useCallback(async (itemPath: string, dest: string) => {
    try {
      await copyItem({ sourcePath: itemPath, destinationPath: dest });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Copy Item",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const handleMoveItem = useCallback(
    async (itemPath: string, dest: string) => {
      try {
        await moveItem({ sourcePath: itemPath, destinationPath: dest });
        revalidateTagItems();
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Move Item",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [revalidateTagItems],
  );

  const sections = useMemo(() => {
    if (!tagItems) return [];

    const folders = tagItems.filter((entry) => isNavigableDirectory(entry));
    const files = tagItems.filter((entry) => !isNavigableDirectory(entry));

    const browserTarget = (dirPath: string) => (
      <DirectoryBrowser
        path={dirPath}
        initialView={view}
        initialSort={sort}
        gridColumns={gridColumns}
        enabledAccessories={enabledAccessories}
        enterAction={enterAction}
      />
    );

    const buildItem = (entry: (typeof tagItems)[number]) => {
      const navDir = isNavigableDirectory(entry);
      const symResolved = entry.type === "symlink" ? resolveSymlink(entry.path) : null;
      const symDirTarget = symResolved?.targetIsDirectory ? symResolved.resolvedPath : null;

      return (
        <Contents.Item
          key={entry.path}
          entry={entry}
          enabledAccessories={enabledAccessories}
          tagCatalog={tagCatalog}
          actions={
            <Contents.ItemActionPanel
              type={entry.type}
              path={entry.path}
              enterAction={enterAction}
              onCopyItem={async (dest) => handleCopyItem(entry.path, dest)}
              onMoveItem={async (dest) => handleMoveItem(entry.path, dest)}
              target={navDir ? browserTarget(entry.path) : undefined}
              symlinkDirectoryTarget={symDirTarget ? browserTarget(symDirTarget) : undefined}
              detail={
                <ItemDetail
                  entry={entry}
                  tagCatalog={tagCatalog}
                  directoryTarget={navDir ? browserTarget(entry.path) : undefined}
                  symlinkDirectoryTarget={symDirTarget ? browserTarget(symDirTarget) : undefined}
                  editTarget={
                    <ItemEdit
                      entry={entry}
                      directoryTarget={navDir ? browserTarget(entry.path) : undefined}
                      symlinkDirectoryTarget={symDirTarget ? browserTarget(symDirTarget) : undefined}
                      onApplied={handleEditApplied}
                      onCopyItem={async (dest) => handleCopyItem(entry.path, dest)}
                      onMoveItem={async (dest) => handleMoveItem(entry.path, dest)}
                    />
                  }
                />
              }
              edit={
                <ItemEdit
                  entry={entry}
                  directoryTarget={navDir ? browserTarget(entry.path) : undefined}
                  symlinkDirectoryTarget={symDirTarget ? browserTarget(symDirTarget) : undefined}
                  onApplied={handleEditApplied}
                  onCopyItem={async (dest) => handleCopyItem(entry.path, dest)}
                  onMoveItem={async (dest) => handleMoveItem(entry.path, dest)}
                />
              }
            />
          }
        />
      );
    };

    const result: ContentsSection[] = [];
    if (folders.length > 0) {
      result.push({
        title: "Folders",
        subtitle: String(folders.length),
        children: folders.map(buildItem),
      });
    }
    if (files.length > 0) {
      result.push({
        title: "Files",
        subtitle: String(files.length),
        children: files.map(buildItem),
      });
    }

    return result;
  }, [
    tagItems,
    view,
    sort,
    gridColumns,
    enabledAccessories,
    enterAction,
    handleCopyItem,
    handleMoveItem,
    handleEditApplied,
    tagCatalog,
  ]);

  return (
    <Contents
      view={view}
      path={`Tag: ${tagName}`}
      counts={tagItems?.length ?? 0}
      isLoading={itemsLoading}
      searchBarPlaceholder={viewState.searchBarPlaceholder}
      emptyTitle={viewState.emptyTitle}
      emptyDescription={viewState.emptyDescription}
      searchBarAccessory={<Contents.Dropdown view={view} sort={sort} onViewChange={setView} onSortChange={setSort} />}
      columns={gridColumns}
      sections={sections}
    />
  );
}

export function TagBrowser({
  initialView,
  initialSort,
  gridColumns,
  enabledAccessories,
  enterAction,
}: TagBrowserProps) {
  const [view, setView] = useState<ContentsViewMode>(initialView);

  const { data: tags, isLoading: tagsLoading, error: tagsError } = useFinderTags();

  const state: TagBrowserState = {
    phase: tagsLoading ? "loading-tags" : "ready",
    tags: tagsError ? null : tags,
    selectedTag: null,
    items: null,
    tagListError: !!tagsError,
    tagQueryError: false,
  };

  const viewState = buildTagBrowserState(state);

  const sections = useMemo(() => {
    if (!tags) return [];

    const buildTagItem = (tag: FinderTag) => {
      const tagView = buildFinderTagView(tag);
      const pushTarget = (
        <TagContents
          tagName={tag.name}
          tagCatalog={tags}
          initialView={view}
          initialSort={initialSort}
          gridColumns={gridColumns}
          enabledAccessories={enabledAccessories}
          enterAction={enterAction}
        />
      );

      if (view === "grid") {
        return (
          <Grid.Item
            key={tag.name}
            title={tag.name}
            content={{ value: { color: tagView.color }, tooltip: tag.name }}
            actions={
              <ActionPanel>
                <Action.Push title="Browse Tagged Items" icon={Icon.MagnifyingGlass} target={pushTarget} />
              </ActionPanel>
            }
          />
        );
      }
      return (
        <List.Item
          key={tag.name}
          icon={{ source: Icon.Tag, tintColor: tagView.color }}
          title={tag.name}
          actions={
            <ActionPanel>
              <Action.Push title="Browse Tagged Items" icon={Icon.MagnifyingGlass} target={pushTarget} />
            </ActionPanel>
          }
        />
      );
    };

    const section: ContentsSection = {
      title: `Tags • ${tags.length}`,
      children: tags.map(buildTagItem),
    };

    return [section];
  }, [tags, view, initialSort, gridColumns, enabledAccessories, enterAction]);

  return (
    <Contents
      view={view}
      path="tags"
      counts={tags?.length ?? 0}
      isLoading={tagsLoading}
      searchBarPlaceholder={viewState.searchBarPlaceholder}
      emptyTitle={viewState.emptyTitle}
      emptyDescription={viewState.emptyDescription}
      searchBarAccessory={
        <Contents.Dropdown view={view} sort={initialSort} onViewChange={setView} onSortChange={() => {}} />
      }
      columns={gridColumns}
      sections={sections}
    />
  );
}
