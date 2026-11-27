import { useMemo, useState } from "react";
import { Icon, List } from "@raycast/api";
import { BrowserItemActions } from "./components/BrowserItemActions";
import { FallbackSearchItem } from "./components/FallbackSearchItem";
import { NotInstalledView } from "./components/NotInstalledView";
import { useBookmarks, useSearchInstalled } from "./hooks/useSearchBrowser";
import { getSiteIcon } from "./lib/data";
import { getDomain, matchesQuery } from "./lib/utils";

export default function SearchBookmarksCommand() {
  const [searchText, setSearchText] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("all");

  const { data: installed, isLoading: checkingInstall } = useSearchInstalled();
  const { data, isLoading, revalidate } = useBookmarks();

  const folders = useMemo(() => {
    const unique = new Set<string>();
    for (const bm of data?.bookmarks ?? []) {
      unique.add(bm.folderLabel);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filtered = useMemo(() => {
    return (data?.bookmarks ?? []).filter((bm) => {
      if (selectedFolder !== "all" && bm.folderLabel !== selectedFolder) return false;
      return matchesQuery(searchText, bm.title, bm.url, bm.folderLabel);
    });
  }, [data, searchText, selectedFolder]);

  const grouped = useMemo(() => {
    const sections = new Map<string, typeof filtered>();
    for (const bm of filtered) {
      const list = sections.get(bm.folderLabel) ?? [];
      list.push(bm);
      sections.set(bm.folderLabel, list);
    }
    return Array.from(sections.entries());
  }, [filtered]);

  if (!checkingInstall && installed === false) {
    return <NotInstalledView />;
  }

  return (
    <List
      isLoading={checkingInstall || isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search bookmarks in Search Browser..."
      filtering={false}
      searchBarAccessory={
        folders.length > 1 ? (
          <List.Dropdown tooltip="Filter by Folder" value={selectedFolder} onChange={setSelectedFolder}>
            <List.Dropdown.Item title="All Folders" value="all" icon={Icon.Folder} />
            {folders.map((folder) => (
              <List.Dropdown.Item key={folder} title={folder} value={folder} icon={Icon.Folder} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {grouped.map(([folderLabel, items]) => (
        <List.Section key={folderLabel} title={folderLabel} subtitle={`${items.length}`}>
          {items.map((bm) => (
            <List.Item
              key={bm.id}
              icon={getSiteIcon(bm.url)}
              title={bm.title}
              subtitle={getDomain(bm.url)}
              actions={<BrowserItemActions title={bm.title} url={bm.url} onRefresh={revalidate} />}
            />
          ))}
        </List.Section>
      ))}

      {searchText.trim() && (
        <List.Section title={filtered.length > 0 ? "Web" : "Search Web"}>
          <FallbackSearchItem query={searchText} browserSettings={data?.settings} />
        </List.Section>
      )}

      {filtered.length === 0 && !searchText.trim() && !isLoading && (
        <List.EmptyView
          icon={Icon.Bookmark}
          title="No Bookmarks Found"
          description="Press ⌘⇧B in Search Browser to bookmark the current page."
        />
      )}
    </List>
  );
}
