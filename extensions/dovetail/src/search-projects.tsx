import { List } from "@raycast/api";
import { ProjectRow } from "./components/ProjectRow";
import { useSearch } from "./hooks/useSearch";
import { endpoints } from "./api/endpoints";

export default function SearchProjects() {
  const { data, isLoading, onQueryChange, numberOfResults, pagination } = useSearch(endpoints.projects);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onQueryChange}
      throttle
      searchBarPlaceholder="Search for projects in your workspace..."
      pagination={pagination}
    >
      <List.Section title="Most relevant" subtitle={numberOfResults}>
        {data.map((item) => (
          <ProjectRow
            key={item.id}
            project={{ ...item, url: item.url ?? undefined }}
            subtitle={item.author?.name ?? undefined}
          />
        ))}
      </List.Section>
    </List>
  );
}
