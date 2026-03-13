import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { makeRequest } from "./sevalla";
import { Database, DatabaseDetailed } from "./types";
import { useState } from "react";
import OpenInSevallaAction from "./components/OpenInSevallaAction";
import DeleteDatabaseAction from "./components/DeleteDatabaseAction";
import SecretListItem from "./components/SecretListItem";
import { DATABASE_TYPES, DATABASE_RESOURCE_TYPES } from "./config";
import CreateDatabase from "./views/create-database";

const DATABASE_ICONS: Record<string, Image.ImageLike> = {
  ready: { source: Icon.CheckCircle, tintColor: Color.Green },
  deleting: { source: Icon.Warning, tintColor: Color.Red },
  error: { source: Icon.XMarkCircleFilled, tintColor: Color.Red },
};

const getDatabaseName = (databaseType: string) =>
  Object.keys(DATABASE_TYPES).find((type) => type.toLowerCase() === databaseType);

export default function SearchDatabases() {
  const {
    isLoading,
    data: databases,
    mutate,
  } = useCachedPromise(
    async () => {
      const result = await makeRequest<{ company: { databases: { items: Database[] } } }>("databases");
      return result.company.databases.items;
    },
    [],
    {
      initialData: [],
    },
  );
  return (
    <List isLoading={isLoading}>
      {!isLoading && !databases.length ? (
        <List.EmptyView
          title="Create your first database"
          description="As soon as you create your first database, it will show up here in a list."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create a Database" target={<CreateDatabase />} onPop={mutate} />
            </ActionPanel>
          }
        />
      ) : (
        databases.map((database) => (
          <List.Item
            key={database.id}
            icon={{
              value: DATABASE_ICONS[database.status] || Icon.QuestionMark,
              tooltip: database.status === "error" ? "Database creation has failed" : database.status,
            }}
            title={database.display_name}
            subtitle={`${getDatabaseName(database.type)} ${database.version}`}
            accessories={[
              { text: DATABASE_RESOURCE_TYPES[database.resource_type_name].size.replace(" Disk space", "") },
              { date: new Date(database.updated_at) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Coin}
                  title="Database Details"
                  target={<DatabaseDetails database={database} />}
                />
                <DeleteDatabaseAction database={database} mutateDatabases={mutate} />
                <Action.Push
                  icon={Icon.Plus}
                  title="Create a Database"
                  target={<CreateDatabase />}
                  onPop={mutate}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function DatabaseDetails({ database }: { database: Database }) {
  const [showSecrets, setShowSecrets] = useState(false);
  const { isLoading, data: details } = useCachedPromise(
    async (databaseId: string) => {
      const result = await makeRequest<{ database: DatabaseDetailed }>(`databases/${databaseId}`);
      return result.database;
    },
    [database.id],
  );

  const CommonActions = () => (
    <>
      <Action
        icon={showSecrets ? Icon.EyeDisabled : Icon.Eye}
        title={showSecrets ? "Hide Secrets" : "Show Secrets"}
        onAction={() => setShowSecrets((show) => !show)}
      />
      <OpenInSevallaAction route={`database/${database.name}/overview`} />
    </>
  );
  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={`Search Databases / ${database.display_name}`}>
      {details && (
        <>
          <List.Item
            icon={Icon.Coin}
            title="Details"
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Status">
                      {database.status === "ready" ? (
                        <List.Item.Detail.Metadata.TagList.Item
                          icon={Icon.CheckCircle}
                          text="Ready"
                          color={Color.Green}
                        />
                      ) : (
                        <List.Item.Detail.Metadata.TagList.Item text={database.status} />
                      )}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label
                      title="Version"
                      icon={`${database.type}.svg`}
                      text={`${getDatabaseName(database.type)} ${database.version}`}
                    />
                    <List.Item.Detail.Metadata.Label title="Location" text={details.cluster.display_name} />
                    <List.Item.Detail.Metadata.Label
                      title="Creation date"
                      text={new Date(details.created_at).toDateString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Database size"
                      text={`? / ${DATABASE_RESOURCE_TYPES[database.resource_type_name].size.replace(" Disk space", "")}`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Resources"
                      icon={Icon.MemoryChip}
                      text={DATABASE_RESOURCE_TYPES[database.resource_type_name].resources.replace(" / ", ", ")}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <CommonActions />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Lock}
            title="Internal connection"
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Host" text={details.internal_hostname} />
                    <List.Item.Detail.Metadata.Label title="Port" text={details.internal_port} />
                    <List.Item.Detail.Metadata.Label title="Database" text={details.data.db_name} />
                    {details.data.db_user && (
                      <List.Item.Detail.Metadata.Label title="User" text={details.data.db_user} />
                    )}
                    <SecretListItem title="Password" text={details.data.db_password} show={showSecrets} />
                    <SecretListItem
                      title="URL"
                      text={`${database.type === "postgresql" ? "postgres" : database.type}://${details.data.db_user}:${details.data.db_password}@${details.internal_hostname}:${details.internal_port}/${details.data.db_name}`}
                      show={showSecrets}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <CommonActions />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Globe}
            title="External connection"
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Host" text={details.external_hostname || "N/A"} />
                    <List.Item.Detail.Metadata.Label title="Port" text={details.external_port || "N/A"} />
                    <List.Item.Detail.Metadata.Label title="Database" text={details.data.db_name} />
                    {details.data.db_user && (
                      <List.Item.Detail.Metadata.Label title="User" text={details.data.db_user} />
                    )}
                    <SecretListItem title="Password" text={details.data.db_password} show={showSecrets} />
                    <SecretListItem title="URL" text={details.external_connection_string} show={showSecrets} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <CommonActions />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
}
