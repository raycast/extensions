import { useDatabaseClusters } from "./client";
import { Action, ActionPanel, Detail, List } from "@raycast/api";
import DatabaseClusterDetail from "./details/DatabaseClusterDetail";

export default function Command() {
  const { data, error, isLoading } = useDatabaseClusters();

  if (error) {
    return <Detail markdown={`Failed to list database clusters: ${error.message}`} />;
  }

  return (
    <List isLoading={isLoading}>
      {data?.databases.map((database) => (
        <List.Item
          key={database.id}
          title={database.name}
          subtitle={database.engine}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" target={<DatabaseClusterDetail database={database} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
