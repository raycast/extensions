import { useMemo, useState } from "react";

import { List, getPreferenceValues } from "@raycast/api";

import ArchiveListItem from "@/components/ArchiveListItem";
import { EmptyView } from "@/components/EmptyView";
import { useArchive } from "@/hooks/use-archive";
import { isEmpty } from "@/utils";

const mirror = getPreferenceValues<Preferences>().mirror ?? "https://annas-archive.org";

const Command = () => {
  const [search, setSearch] = useState("");

  const { data, error, isLoading } = useArchive(mirror, search);

  const listData = useMemo(() => {
    if (!data || search.length === 0) {
      return [];
    }
    return data;
  }, [data, search]);

  const emptyViewTitle = useMemo(() => {
    if (isLoading) {
      return "Loading...";
    }
    if (listData.length === 0 && !isEmpty(search)) {
      return "No Results";
    }
    return "Search on Anna's Archive";
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
      {listData.length === 0 ? <EmptyView title={emptyViewTitle} /> : undefined}
      {error ? <List.Item title="Error" subtitle={error.message} /> : undefined}
      {!error ? listData.map((item) => <ArchiveListItem key={item.id} item={item} />) : undefined}
    </List>
  );
};

export default Command;
