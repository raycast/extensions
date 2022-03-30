import { Action, Icon, List } from "@raycast/api";

import { HOME_PAGE, useHighlights } from "./highlights/useHighlights";
import { HighlightsListItem } from "./highlights/HighlightsListItem";
import { ResultsList } from "./components/ResultsList";

export default function Command() {
  const { data, loading, refetch } = useHighlights();
  const { next, previous } = data || {};

  return (
    <List isLoading={loading} enableFiltering>
      <ResultsList
        loading={loading}
        data={data}
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
                <Action icon={"🏠"} title="Back to Home" onAction={() => refetch(HOME_PAGE)} />
              </>
            )}
          </>
        }
        listView={HighlightsListItem}
      />
    </List>
  );
}
