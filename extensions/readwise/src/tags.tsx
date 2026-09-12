import { List } from "@raycast/api";

import { BASE_URL, useTags } from "./tags/useTags";
import { TagsListItem } from "./tags/TagsListItem";
import { getListSubtitle } from "./utils";
import { ListActions } from "./components/Actions";
import { ListWithEmptyView } from "./components/ResultsList";

export default function Command() {
  const { data, loading, refetch } = useTags();
  const { next, previous } = data || {};

  const totalCount = data?.results.length || 0;
  const listSubtitle = getListSubtitle(loading, totalCount);

  return (
    <List isLoading={loading} enableFiltering>
      <ListWithEmptyView />

      <List.Section title="Results" subtitle={listSubtitle}>
        {data?.results.map((result) => (
          <TagsListItem
            key={result.name}
            item={result}
            actions={
              <ListActions
                onHomeAction={() => refetch(BASE_URL)}
                onNextAction={next ? () => refetch(next) : undefined}
                onPreviousAction={previous ? () => previous && refetch(previous) : undefined}
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
