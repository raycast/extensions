import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  LaunchProps,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { deleteDatabase, listDatabasesInDomain } from "./utils/api";
import { useEffect, useState } from "react";
import { Database, ListDatabasesInDomainResponse } from "./types/databases";
import ErrorComponent from "./components/ErrorComponent";
import CreateDatabase from "./components/databases/CreateDatabaseComponent";

export default function ListDatabasesInDomain(props: LaunchProps<{ arguments: Arguments.ListDatabasesInDomain }>) {
  const { databaseWebsite } = props.arguments;

  const [isLoading, setIsLoading] = useState(true);
  const [databases, setDatabases] = useState<Database[]>();
  const [error, setError] = useState("");

  async function getFromApi() {
    const response = await listDatabasesInDomain({ databaseWebsite });
    if (response.error_message === "None") {
      const successResponse = response as ListDatabasesInDomainResponse;
      const data = typeof successResponse.data === "string" ? JSON.parse(successResponse.data) : successResponse.data;

      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${data.length} Databases`);
      setDatabases(data);
    } else {
      setError(response.error_message);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  async function confirmAndDelete(dbName: string) {
    if (
      await confirmAlert({
        title: `Delete Database '${dbName}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const response = await deleteDatabase({ dbName });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Deleted ${dbName} successfully`);
        await getFromApi();
      }
    }
  }

  return error ? (
    <ErrorComponent errorMessage={error} />
  ) : (
    <List isLoading={isLoading}>
      {databases &&
        databases.map((database) => (
          <List.Item
            key={database.id}
            title={database.id + " - " + database.dbName}
            icon={Icon.Coin}
            accessories={[{ tag: `user: ${database.dbUser}` }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Delete Database"
                    icon={Icon.DeleteDocument}
                    onAction={() => confirmAndDelete(database.dbName)}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create Database"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create Database"
                  icon={Icon.Plus}
                  target={<CreateDatabase initialDatabaseWebsite={databaseWebsite} onDatabaseCreated={getFromApi} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
