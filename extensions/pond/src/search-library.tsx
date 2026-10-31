import { pathToFileURL } from "node:url";
import { Action, ActionPanel, Icon, List, Keyboard, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { pondClient } from "./api";
import { PAGE_SIZE } from "./api/client";
import type { PondCursor } from "./api/schemas";
import { ConnectionActions } from "./components/connection-actions";
import { hostname, saveCaption, savedDate, saveTitle } from "./save-display";
import { SOURCES, sourceLabel } from "./sources";
import { loadThumbnail } from "./thumbnail";
import { SearchFiltersForm, type SearchFilters } from "./components/search-filters";

function searchPages(keywords: string, source: string, filters: SearchFilters) {
  return async ({ cursor }: { cursor?: PondCursor | null }) => {
    const page = await pondClient().search({ keywords, source: source || undefined, cursor, ...filters });
    return { data: page.saves, cursor: page.nextCursor, hasMore: page.nextCursor !== null };
  };
}

export default function SearchLibrary() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const {
    data: saves,
    error,
    isLoading,
    pagination,
    revalidate,
  } = usePromise(searchPages, [query, source, filters], {
    failureToastOptions: { title: "Could Not Load Saves" },
  });
  const selectedSave = saves?.find((save) => save.id === selectedId) ?? saves?.[0];
  const { data: thumbnail, isLoading: loadingThumbnail } = usePromise(
    loadThumbnail,
    [selectedSave?.id ?? "", selectedSave?.libraryId ?? ""],
    { execute: Boolean(selectedSave), onError: () => undefined },
  );

  async function copyFile(save: { id: string; libraryId: string }) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Copying File" });
    try {
      await pondClient().copySaveFile(save);
      toast.style = Toast.Style.Success;
      toast.title = "Copied File";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Copy File";
      toast.message = error instanceof Error ? error.message : "Open the save in Pond and try again.";
    }
  }

  const filterSummary = [
    filters.tag ? `Tag: ${filters.tag}` : "",
    filters.savedSince === undefined ? "" : `Since: ${new Date(filters.savedSince).toLocaleDateString()}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const filterActions = (
    <>
      <Action.Push
        title="Filter Saves"
        icon={Icon.Filter}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        target={<SearchFiltersForm filters={filters} onApply={setFilters} />}
      />
      {filterSummary ? (
        <Action title="Clear Tag and Date Filters" icon={Icon.XMarkCircle} onAction={() => setFilters({})} />
      ) : null}
    </>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={Boolean(saves?.length)}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder={filterSummary ? `Search saves · ${filterSummary}` : "Search your Pond library…"}
      throttle
      pagination={
        pagination ? { ...pagination, pageSize: PAGE_SIZE, hasMore: !error && pagination.hasMore } : undefined
      }
      actions={
        <ActionPanel>
          {filterActions}
          <ConnectionActions onRefresh={revalidate} />
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Source" value={source} onChange={setSource}>
          <List.Dropdown.Item title="All Sources" value="" />
          <List.Dropdown.Section>
            {SOURCES.map((item) => (
              <List.Dropdown.Item key={item.id} title={item.title} value={item.id} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
        title={error ? "Could Not Load Pond Library" : isLoading ? "Loading Saves…" : "No Saves Found"}
        description={
          error?.message ??
          (query || source || filterSummary
            ? "Try different keywords or another source."
            : "Save a URL to your active library to get started.")
        }
      />
      {saves?.map((save) => {
        const preview = thumbnail?.id === save.id && thumbnail.libraryId === save.libraryId ? thumbnail.path : null;
        const webUrl = /^https?:/.test(save.url);
        return (
          <List.Item
            key={save.id}
            id={save.id}
            icon={Icon.Bookmark}
            title={saveTitle(save)}
            detail={
              <List.Item.Detail
                isLoading={selectedSave?.id === save.id && loadingThumbnail}
                markdown={`${preview ? `![](${pathToFileURL(preview).href})\n\n` : ""}${saveCaption(save)}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Source" text={sourceLabel(save.source)} />
                    {save.author ? <List.Item.Detail.Metadata.Label title="Author" text={save.author} /> : null}
                    <List.Item.Detail.Metadata.Label title="Saved" text={savedDate(save.savedAt)} />
                    {save.tags.length ? (
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {[...new Set(save.tags)].map((tag) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={tag}
                            text={tag}
                            onAction={() => setFilters((current) => ({ ...current, tag }))}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : null}
                    {webUrl ? (
                      <List.Item.Detail.Metadata.Link title="Original" target={save.url} text={hostname(save.url)} />
                    ) : null}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Open title="Open in Pond" icon={Icon.AppWindow} target={save.pondUrl} />
                {webUrl ? (
                  <Action.OpenInBrowser title="Open Original" url={save.url} shortcut={Keyboard.Shortcut.Common.Open} />
                ) : null}
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={save.url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard title="Copy Pond Link" content={save.pondUrl} />
                <Action
                  title="Copy File"
                  icon={Icon.Document}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  onAction={() => copyFile(save)}
                />
                <ActionPanel.Section>
                  {filterActions}
                  <ConnectionActions onRefresh={revalidate} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
