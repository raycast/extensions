import { Action, List } from "@raycast/api";

import { useTags } from "./tags/useTags";
import { TagsListItem } from "./tags/TagsListItem";
import { getListSubtitle } from "./utils";

export default function Command() {
  const { data, loading, refetch } = useTags();
  const { next, previous } = data || {};

  const totalCount = data?.results.length || 0;
  const listSubtitle = getListSubtitle(loading, totalCount);

  return (
    <List isLoading={loading} enableFiltering>
      <List.Section title="Results" subtitle={listSubtitle}>
        {!loading && !data?.results.length && <List.EmptyView title="Nothing found." />}

        {data?.results.map((result) => (
          <TagsListItem
            key={result.name}
            item={result}
            actions={
              <>
                {next && (
                  <Action
                    icon={"➡️"}
                    title="Next Page"
                    onAction={() => refetch(next)}
                    shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                  />
                )}
                {previous && (
                  <>
                    <Action
                      icon={"⬅️"}
                      title="Previous Page"
                      onAction={() => refetch(previous)}
                      shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                    />
                    <Action icon={"🏠"} title="Back to Home" onAction={() => refetch("")} />
                  </>
                )}
              </>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
