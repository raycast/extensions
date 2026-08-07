import { Action, ActionPanel, Icon, List } from "@raycast/api";
import Fuse from "fuse.js";
import { useEffect, useMemo, useState } from "react";
import useFiles from "../hooks/use-files";
import { getFavorites, isFavorite } from "../helpers/favorites";
import { completeTag, matchesTags, parseSearchQuery } from "../helpers/search-query";
import { sanitizeUrl } from "../helpers/url-sanitizer";
import { File } from "../types";
import FileListItem from "./FileListItem";
import path from "node:path";

const MAX_TAG_SUGGESTIONS = 6;

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

function midnight(daysAgo: number): Date {
  const date = new Date(Date.now() - daysAgo * ONE_DAY_IN_MS);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function SearchBookmarks() {
  const { files, loading, updateFile } = useFiles();
  const [showDetail, setShowDetail] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [fileResult, setFileResult] = useState<File[]>(files);

  const tagsByPopularity = useMemo(() => {
    const allTags = files.flatMap((file) => file.attributes.tags);
    const ranked = allTags.reduce(
      (memo, tag) => ({
        ...memo,
        [tag]: (memo[tag] ?? 0) + 1,
      }),
      {} as Record<string, number>
    );

    return Object.entries(ranked).sort((a, b) => b[1] - a[1]);
  }, [files]);

  const filePathsAlphabetical = useMemo(() => {
    const uniquePaths = Array.from(new Set(files.map((file) => path.dirname(file.fullPath))));
    return uniquePaths
      .map((dirPath) => dirPath) // Get the last 32 characters of each directory path
      .sort((a, b) => a.localeCompare(b)); // Sort the paths alphabetically
  }, [files]);

  const { text, tags: searchTags, pendingTag } = useMemo(() => parseSearchQuery(search), [search]);

  const urlFuse = useMemo(() => {
    return new Fuse<File>(files, {
      ignoreLocation: true,
      threshold: 0.4,
      keys: [{ name: "url", getFn: (file) => sanitizeUrl(file.attributes.source) }],
    });
  }, [files]);

  const contentFuse = useMemo(() => {
    return new Fuse<File>(files, {
      fieldNormWeight: 1,
      ignoreLocation: true,
      keys: [
        { name: "title", weight: 5, getFn: (file) => file.attributes.title },
        { name: "tags", weight: 2, getFn: (file) => file.attributes.tags },
        { name: "body", weight: 2 },
      ],
    });
  }, [files]);

  const tagSuggestions = useMemo(() => {
    if (pendingTag == null) return [];
    const query = pendingTag.toLowerCase();
    return tagsByPopularity
      .filter(([tag]) => tag.toLowerCase() !== query && tag.toLowerCase().includes(query))
      .slice(0, MAX_TAG_SUGGESTIONS);
  }, [pendingTag, tagsByPopularity]);

  useEffect(() => {
    const filtered = (input: File[]) => {
      switch (filter) {
        case "all": {
          return input;
        }
        case "unread": {
          return input.filter((item) => !item.attributes.read);
        }
        case "read": {
          return input.filter((item) => item.attributes.read);
        }
        case "last1d": {
          const date = midnight(1);
          return input.filter((item) => item.attributes.saved >= date);
        }
        case "last7d": {
          const date = midnight(7);
          return input.filter((item) => item.attributes.saved >= date);
        }
        case "last30d": {
          const date = midnight(30);
          return input.filter((item) => item.attributes.saved >= date);
        }
        default: {
          if (filter.startsWith("tag:")) {
            const tag = filter.slice(4);
            return input.filter((item) => item.attributes.tags.includes(tag));
          } else if (filter.startsWith("fpath:")) {
            const fpath = filter.slice(6);
            return input.filter((item) => item.fullPath.startsWith(fpath));
          }

          throw new Error(`Unknown filter: ${filter}`);
        }
      }
    };

    // URL matches (query params stripped) come first, then title/tags/body matches.
    const searched = () => {
      if (!text) return files;
      const byUrl = urlFuse.search(text).map(({ item }) => item);
      const matched = new Set(byUrl.map((file) => file.fullPath));
      const byContent = contentFuse.search(text).map(({ item }) => item);
      return [...byUrl, ...byContent.filter((file) => !matched.has(file.fullPath))];
    };

    const items = searched().filter((file) => matchesTags(file, searchTags));
    const filteredItems = filtered(items);
    setFileResult(filteredItems);
  }, [text, searchTags, filter, urlFuse, contentFuse]);

  const actionProps = { showDetail, setShowDetail, onFileUpdated: updateFile };
  const favoriteResults = getFavorites(fileResult);
  const otherResults = fileResult.filter((file) => !isFavorite(file));

  return (
    <List
      enableFiltering={false}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Bookmarks" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Unread" value="unread" />
          <List.Dropdown.Item title="Read" value="read" />
          <List.Dropdown.Section>
            <List.Dropdown.Item title="Last 24 Hours" value="last1d" />
            <List.Dropdown.Item title="Last 7 Days" value="last7d" />
            <List.Dropdown.Item title="Last Month" value="last30d" />
          </List.Dropdown.Section>
          {tagsByPopularity.length > 0 && (
            <List.Dropdown.Section title="Tags">
              {tagsByPopularity.map(([tag, count]) => (
                <List.Dropdown.Item title={`${tag} (${count})`} value={`tag:${tag}`} key={tag} />
              ))}
            </List.Dropdown.Section>
          )}
          {filePathsAlphabetical.length > 0 && (
            <List.Dropdown.Section title="Directories">
              {filePathsAlphabetical.map((filePath) => (
                <List.Dropdown.Item title={`...${filePath.slice(-29)}`} value={`fpath:${filePath}`} key={filePath} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
      isLoading={loading}
      navigationTitle="Search Bookmarks"
      searchBarPlaceholder="Search bookmarks, use # to filter by tag"
      isShowingDetail={showDetail}
      searchText={search}
      onSearchTextChange={(text) => setSearch(text)}
      throttle
    >
      {tagSuggestions.length > 0 && (
        <List.Section title="Tags">
          {tagSuggestions.map(([tag, count]) => (
            <List.Item
              id={`tag:${tag}`}
              title={`#${tag}`}
              accessories={[{ text: `${count}` }]}
              icon={Icon.Hashtag}
              key={`tag:${tag}`}
              actions={
                <ActionPanel>
                  <Action
                    title="Complete Tag"
                    icon={Icon.Hashtag}
                    shortcut={{ modifiers: [], key: "tab" }}
                    onAction={() => setSearch(completeTag(search, tag))}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {favoriteResults.length > 0 && (
        <List.Section title="Favorites">
          {favoriteResults.map((file) => (
            <FileListItem file={file} files={files} loading={loading} key={file.fullPath} {...actionProps} />
          ))}
        </List.Section>
      )}
      <List.Section title={tagSuggestions.length > 0 || favoriteResults.length > 0 ? "Bookmarks" : undefined}>
        {otherResults.map((file) => (
          <FileListItem file={file} files={files} loading={loading} key={file.fullPath} {...actionProps} />
        ))}
      </List.Section>
    </List>
  );
}
