import { useDatabaseClusters } from "./client";
import { Action, ActionPanel, Detail, List } from "@raycast/api";
import DatabaseClusterDetail from "./details/DatabaseClusterDetail";
import { DO } from "./config";

export default function Command() {
  const { data, error, isLoading } = useDatabaseClusters();
  const databases = data?.databases || [];

  if (error) {
    return <Detail markdown={`Failed to list database clusters: ${error.message}`} />;
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && !databases.length && (
        <List.EmptyView
          icon={DO.LOGO}
          title="Managed Databases. Simplified"
          description="Create your first database cluster now"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={DO.ICON} title="Create Database" url={DO.LINKS.databases.new} />
            </ActionPanel>
          }
        />
      )}
      {databases.map((database) => (
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
