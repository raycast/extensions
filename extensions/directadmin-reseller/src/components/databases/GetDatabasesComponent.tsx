import { SuccessResponse } from "../../types";
import { deleteDatabase } from "../../utils/api";
import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import ErrorComponent from "../ErrorComponent";
import CreateDatabaseComponent from "./CreateDatabaseComponent";
import { useGetDatabases } from "../../utils/hooks";
import { RESELLER_USERNAME } from "../../utils/constants";

type GetDatabasesComponentProps = {
  userToImpersonate?: string;
};
export default function GetDatabasesComponent({ userToImpersonate = "" }: GetDatabasesComponentProps) {
  const { isLoading, data: databases = [], error, revalidate } = useGetDatabases(userToImpersonate);

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
        revalidate();
      }
    }
  }

  return error ? (
    <ErrorComponent errorResponse={error} />
  ) : (
    <List isLoading={isLoading} searchBarPlaceholder="Search database">
      <List.Section title={userToImpersonate || RESELLER_USERNAME} subtitle={`${databases.length} databases`}>
        {databases.map((db) => (
          <List.Item
            key={db.database}
            title={db.database}
            subtitle={`${db.sizeBytes.toString()} bytes`}
            icon={Icon.Coin}
            accessories={[
              { tag: db.userCount.toString(), icon: Icon.TwoPeople },
              { tag: db.tableCount.toString(), icon: Icon.AppWindowList },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Delete Database"
                  icon={Icon.DeleteDocument}
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndDeleteDatabase(db.database)}
                />
                <ActionPanel.Section>
                  <Action.Push
                    title="Create Database"
                    icon={Icon.Plus}
                    target={
                      <CreateDatabaseComponent onDatabaseCreated={revalidate} userToImpersonate={userToImpersonate} />
                    }
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
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
                    <CreateDatabaseComponent onDatabaseCreated={revalidate} userToImpersonate={userToImpersonate} />
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
