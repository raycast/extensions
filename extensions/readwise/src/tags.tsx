import { List } from "@raycast/api";

import { useTags } from "./tags/useTags";
import { TagsList } from "./tags/TagsList";
import { getListSubtitle } from "./utils";

export default function Command() {
  const { data, loading, refetch } = useTags();

  const totalCount = data?.results.length || 0;
  const listSubtitle = getListSubtitle(loading, totalCount);

  return (
    <List
      isLoading={loading}
      enableFiltering
      searchBarAccessory={
        <List.Dropdown tooltip="Search Options" onChange={refetch} value="">
          <List.Dropdown.Item title={"Default Search Options"} value={""} />

          <List.Dropdown.Section title="Page Navigation">
            {data?.previous && <List.Dropdown.Item title={"Previous Page"} value={data.previous} />}
            {data?.next && <List.Dropdown.Item title={"Next Page"} value={data.next} />}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title="Results" subtitle={listSubtitle}>
        {!loading && !data?.results.length && <List.EmptyView title="Nothing found." />}

        {data?.results.map((result) => (
          <TagsList key={result.name} item={result} />
        ))}
      </List.Section>
    </List>
  );
}
