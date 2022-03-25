import { List } from "@raycast/api";

import { useHighlights } from "./highlights/useHighlights";
import { HighlightsList } from "./highlights/HighlightsList";

export default function Command() {
  const { data, loading, refetch } = useHighlights();

  return (
    <List
      isLoading={loading}
      enableFiltering
      searchBarAccessory={
        <List.Dropdown tooltip="Search Options" onChange={refetch} value="">
          <List.Dropdown.Section title="Page Navigation">
            <List.Dropdown.Item title={"Choose Pagination"} value={""} />
            {data?.previous && <List.Dropdown.Item title={"Previous Page"} value={data.previous} />}
            {data?.next && <List.Dropdown.Item title={"Next Page"} value={data.next} />}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title="Results" subtitle={data?.results.length + ""}>
        {data?.results.map((result) => (
          <HighlightsList key={result.id} item={result} />
        ))}
      </List.Section>
    </List>
  );
}
