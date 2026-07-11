import { List } from "@raycast/api";

import { BASE_URL, useHighlights } from "./highlights/useHighlights";
import { HighlightsListItem } from "./highlights/HighlightsListItem";
import { ResultsList } from "./components/ResultsList";
import { ListActions } from "./components/Actions";

export default function Command() {
  const { data, loading, refetch } = useHighlights();
  const { next, previous } = data || {};

  return (
    <List isLoading={loading} enableFiltering>
      <ResultsList
        loading={loading}
        data={data}
        actions={
          <ListActions
            onHomeAction={() => refetch(BASE_URL)}
            onNextAction={next ? () => refetch(next) : undefined}
            onPreviousAction={previous ? () => previous && refetch(previous) : undefined}
          />
        }
        listView={HighlightsListItem}
      />
    </List>
  );
}
