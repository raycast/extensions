import { useCallback, useMemo, useState } from "react";
import { ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useArchive } from "@/hooks/use-archive";
import { useMirrorDomain } from "@/hooks/use-mirror-domain";
import { isEmpty } from "@/utils";
import { TestMirrors } from "@/screens/TestMirrors";
import { ArchiveListItem } from "@/components/ArchiveListItem";
import { TestMirrorsAction } from "@/components/TestMirrorsAction";

const Command = () => {
  const { push } = useNavigation();
  const [search, setSearch] = useState("");

  const usedMirror = useMirrorDomain();

  const onErrorPrimaryAction = useCallback(() => {
    push(<TestMirrors />);
  }, [push]);

  const { data, error, isLoading } = useArchive(usedMirror.url, onErrorPrimaryAction, search);

  const listData = useMemo(() => {
    if (!data || search.length === 0) {
      return [];
    }
    return data;
  }, [data, search]);

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
    >
      {(!error && !isLoading && listData.length === 0) || error ? (
        <List.EmptyView
          title={error ? "Error" : emptyViewTitle.title}
          description={error ? error.message : emptyViewTitle.description}
          icon={{ source: Icon.Book }}
          actions={
            <ActionPanel>
              <TestMirrorsAction />
            </ActionPanel>
          }
        />
      ) : undefined}
      {!error && listData.map((item) => <ArchiveListItem key={item.id} item={item} />)}
    </List>
  );
};

export default Command;
