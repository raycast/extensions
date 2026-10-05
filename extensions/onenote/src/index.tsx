import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Directory } from "./directory";
import { create_or_update_db } from "./database";

export default function Command() {
  const { data, error, revalidate } = usePromise(async () => {
    return await create_or_update_db();
  });

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Load OneNote Notes"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  if (!data) return <List isLoading={true} />;

  return <Directory fullTextIndexed={data.fullTextIndexed} />;
}
