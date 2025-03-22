import { List } from "@raycast/api";
import { useModrinthSearch } from "./hooks/use-modrinth-search";
import { useState } from "react";
import { useDebounce } from "./utils/use-debounce";
import { ProjectListEntry } from "./project-list-entry";

export default function Command() {
  const { data, handleSearchChange, isLoading, onLoadMore, pagination } = useModrinthSearch();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const debouncedHandleSelectionChange = useDebounce((id: string | null) => setSelectedId(id), 500);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for any modrinth project"
      onSearchTextChange={handleSearchChange}
      onSelectionChange={debouncedHandleSelectionChange}
      pagination={{
        onLoadMore,
        hasMore: pagination.hasMore,
        pageSize: pagination.pageSize,
      }}
      isShowingDetail
    >
      {data.length ? (
        data.map((item) => {
          return <ProjectListEntry isSelected={selectedId === item.slug} listProject={item} key={item.slug} />;
        })
      ) : (
        <List.EmptyView title="No projects found" description="We couldn't find any projects matching your query." />
      )}
    </List>
  );
}
