import { List } from "@raycast/api";
import Fuse from "fuse.js";
import { useEffect, useMemo, useState } from "react";
import useFiles from "../hooks/use-files";
import { File } from "../types";
import FileListItem from "./FileListItem";

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

function midnight(daysAgo: number): Date {
  const date = new Date(Date.now() - daysAgo * ONE_DAY_IN_MS);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function SearchBookmarks() {
  const { files, loading } = useFiles();
  const [showDetail, setShowDetail] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [fileResult, setFileResult] = useState<File[]>(files);

  const tagsByPopularity = useMemo(() => {
    const allTags = files.flatMap((file) => file.attributes.tags);
    const ranked = allTags.reduce(
      (memo, tag) => ({
        ...memo,
        [tag]: memo[tag] ?? 1,
      }),
      {} as Record<string, number>
    );

    return Object.entries(ranked).sort((a, b) => b[1] - a[1]);
  }, [files]);

  const fuse = useMemo(() => {
    return new Fuse<File>(files, {
      fieldNormWeight: 1,
      keys: [
        { name: "title", weight: 5 },
        { name: "tags", weight: 2 },
        { name: "body", weight: 2 },
        { name: "url", weight: 1 },
      ],
    });
  }, [files]);

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
          return input.filter((item) => item.attributes.added >= date);
        }
        case "last7d": {
          const date = midnight(7);
          return input.filter((item) => item.attributes.added >= date);
        }
        case "last30d": {
          const date = midnight(30);
          return input.filter((item) => item.attributes.added >= date);
        }
        default: {
          if (!filter.startsWith("tag:")) {
            throw new Error(`Unknown filter: ${filter}`);
          }
          const tag = filter.slice(4);
          return input.filter((item) => item.attributes.tags.includes(tag));
        }
      }
    };

    const items = search.trim() ? fuse.search(search).map(({ item }) => item) : files;
    const filteredItems = filtered(items);
    setFileResult(filteredItems);
  }, [search, filter, fuse]);

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
        </List.Dropdown>
      }
      isLoading={loading}
      navigationTitle="Search Bookmarks"
      isShowingDetail={showDetail}
      searchText={search}
      onSearchTextChange={(text) => setSearch(text)}
      throttle
    >
      {fileResult.map((file) => (
        <FileListItem
          file={file}
          loading={loading}
          showDetail={showDetail}
          setShowDetail={setShowDetail}
          key={file.fullPath}
        />
      ))}
    </List>
  );
}
