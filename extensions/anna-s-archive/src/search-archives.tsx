import { useCallback, useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Icon, List, LocalStorage, useNavigation } from "@raycast/api";
import { type ArchiveFilter, isArchiveFilter, useArchive } from "@/hooks/use-archive";
import { useMirrorDomain } from "@/hooks/use-mirror-domain";
import { isEmpty } from "@/utils";
import { TestMirrors } from "@/screens/TestMirrors";
import { ArchiveListItem } from "@/components/ArchiveListItem";
import { TestMirrorsAction } from "@/components/TestMirrorsAction";
import { FILE_TYPES } from "@/constants";
import { rankArchiveItems } from "@/utils/ranking";

const FILTER_STORAGE_KEY = "anna-s-archive-search-filter";

const Command = () => {
  const { push } = useNavigation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ArchiveFilter>("all");

  const usedMirror = useMirrorDomain();

  const onErrorPrimaryAction = useCallback(() => {
    push(<TestMirrors />);
  }, [push]);

  useEffect(() => {
    LocalStorage.getItem<string>(FILTER_STORAGE_KEY).then((value) => {
      if (value && isArchiveFilter(value)) {
        setFilter(value);
      }
    });
  }, []);

  const handleFilterChange = useCallback((value: string) => {
    const nextFilter: ArchiveFilter = isArchiveFilter(value) ? value : "all";
    setFilter(nextFilter);
    LocalStorage.setItem(FILTER_STORAGE_KEY, nextFilter);
  }, []);

  const { data, error, isLoading } = useArchive(usedMirror.url, onErrorPrimaryAction, search, filter);

  const listData = useMemo(() => {
    if (!data || search.length === 0) {
      return [];
    }
    return rankArchiveItems(data, search, filter);
  }, [data, filter, search]);

  const emptyViewTitle = useMemo(() => {
    if (isLoading) {
      return { title: "Loading..." };
    }
    if (listData.length === 0 && !isEmpty(search)) {
      return { title: "No Results", description: "Try a different search term" };
    }
    return { title: "Search on Anna's Archive" };
  }, [listData, isLoading, search]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Archives"
      onSearchTextChange={setSearch}
      throttle={true}
      filtering={false}
      isShowingDetail={listData.length > 0}
      searchBarAccessory={
        <List.Dropdown tooltip="File Type" value={filter} onChange={handleFilterChange}>
          <List.Dropdown.Item title="All" value="all" />
          {FILE_TYPES.map((fileType) => (
            <List.Dropdown.Item key={fileType} title={fileType.toUpperCase()} value={fileType} />
          ))}
        </List.Dropdown>
      }
    >
      {error && (
        <List.EmptyView
          title="Whoops! Something went wrong."
          description={
            "An error occurred! It might be that the mirror is down. Please press Enter to test the mirrors and maybe change to a different one in your extension preferences. If all are down, please copy the error message (See Actions) and report the issue."
          }
          icon={{ source: Icon.WifiDisabled }}
          actions={
            <ActionPanel>
              <TestMirrorsAction />
              <Action.CopyToClipboard
                title="Copy Error Message"
                content={`Mirror: ${usedMirror.url}\nError: ${error.message}\nStack: ${error.stack}\nSearch: ${search}`}
                icon={Icon.Clipboard}
              />
            </ActionPanel>
          }
        />
      )}
      {!error && !isLoading && listData.length === 0 && (
        <List.EmptyView
          title={emptyViewTitle.title}
          description={emptyViewTitle.description}
          icon={{ source: Icon.Book }}
        />
      )}
      {!error && listData.map((item) => <ArchiveListItem key={item.id} item={item} />)}
    </List>
  );
};

export default Command;
