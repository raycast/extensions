import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { QueryLogs } from "./components/QueryLogs";
import { useSavedQueries } from "./hooks/useSavedQueries";
import { useDefaultSourceId } from "./hooks/useDefaultSourceId";
import { getQueryString } from "./lib/helpers";

const SavedQueriesCommand = () => {
  const { data: savedQueries, isLoading, removeQuery } = useSavedQueries();
  const { data: sourceIdData } = useDefaultSourceId();

  const [query, setQuery] = useState<string>();

  if (query) {
    return <QueryLogs query={query} sourceId={sourceIdData} />;
  }

  return (
    <List isLoading={isLoading}>
      {savedQueries?.map((query, index) => (
        <List.Item
          key={index}
          title={query}
          actions={
            <ActionPanel>
              <Action.SubmitForm
                title="Query"
                icon={Icon.MagnifyingGlass}
                shortcut={{ modifiers: ["cmd"], key: "q" }}
                onSubmit={async () => {
                  setQuery(getQueryString(query, sourceIdData).query);
                }}
              />
              <Action.SubmitForm
                title="Remove Query"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd"], key: "delete" }}
                onSubmit={async () => {
                  await removeQuery(query);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      {savedQueries?.length === 0 && <List.EmptyView title="No Saved Queries Found"></List.EmptyView>}
    </List>
  );
};

export default SavedQueriesCommand;
