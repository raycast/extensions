import { useEffect, useState } from "react";
import { ErrorResponse, GetDatabasesResponse, SuccessResponse } from "../../types";
import { deleteDatabase, getDatabases } from "../../utils/api";
import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import ErrorComponent from "../ErrorComponent";
import CreateDatabaseComponent from "./CreateDatabaseComponent";

type GetDatabasesComponentProps = {
  userToImpersonate?: string;
};
export default function GetDatabasesComponent({ userToImpersonate = "" }: GetDatabasesComponentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [databases, setDatabases] = useState<string[]>();
  const [error, setError] = useState<ErrorResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getDatabases(userToImpersonate);

    if (response.error === "0") {
      const data = response as GetDatabasesResponse;
      const { list = [] } = data;
      setDatabases(list);
      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Databases`);
    } else if (response.error === "1") setError(response as ErrorResponse);
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  async function confirmAndDeleteDatabase(database: string) {
    if (
      await confirmAlert({
        title: `Delete database '${database}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const response = await deleteDatabase({ action: "delete", select0: database }, userToImpersonate);
      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        await getFromApi();
      }
    }
  }

  return error ? (
    <ErrorComponent errorResponse={error} />
  ) : (
    <List isLoading={isLoading}>
      {databases &&
        databases.map((database) => (
          <List.Item
            key={database}
            title={database}
            icon={Icon.Coin}
            actions={
              <ActionPanel>
                <Action
                  title="Delete Database"
                  icon={Icon.DeleteDocument}
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndDeleteDatabase(database)}
                />
                <ActionPanel.Section>
                  <Action.Push
                    title="Create Database"
                    icon={Icon.Plus}
                    target={
                      <CreateDatabaseComponent onDatabaseCreated={getFromApi} userToImpersonate={userToImpersonate} />
                    }
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
                  target={
                    <CreateDatabaseComponent onDatabaseCreated={getFromApi} userToImpersonate={userToImpersonate} />
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
