import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { deleteUser, listUsers } from "./utils/api";
import { useEffect, useState } from "react";
import { ListUsersResponse, User } from "./types/users";
import ErrorComponent from "./components/ErrorComponent";
import CreateUser from "./components/users/CreateUserComponent";
import ModifyUser from "./components/users/ModifyUserComponent";
import ChangeUserACL from "./components/users/ChangeUserACLComponent";

export default function ListUsers() {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>();
  const [error, setError] = useState("");

  async function getFromApi() {
    const response = await listUsers();
    if (response.error_message === "None") {
      const successResponse = response as ListUsersResponse;
      const usersData =
        typeof successResponse.data === "string" ? JSON.parse(successResponse.data) : successResponse.data;

      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${usersData.length} users`);
      setUsers(usersData);
    } else {
      setError(response.error_message);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  async function confirmAndDelete(user: User) {
    if (
      await confirmAlert({
        title: `Delete user '${user.userName}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const response = await deleteUser({ accountUsername: user.userName });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Deleted ${user.userName} successfully`);
        await getFromApi();
      }
    }
  }

  return error ? (
    <ErrorComponent errorMessage={error} />
  ) : (
    <List isLoading={isLoading} isShowingDetail>
      {users &&
        users.map((user) => (
          <List.Item
            key={user.id}
            title={user.userName}
            icon={user.acl.includes("admin") ? Icon.PersonCircle : Icon.Person}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={user.id.toString()} />
                    <List.Item.Detail.Metadata.Label title="Username" text={user.userName} />
                    <List.Item.Detail.Metadata.Label title="First Name" text={user.firstName} />
                    <List.Item.Detail.Metadata.Label title="Last Name" text={user.lastName} />
                    <List.Item.Detail.Metadata.Label title="Email" text={user.email} />
                    <List.Item.Detail.Metadata.Label title="ACL" text={user.acl} />
                    <List.Item.Detail.Metadata.Label title="Websites Limit" text={user.websitesLimit.toString()} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy as JSON" icon={Icon.Clipboard} content={JSON.stringify(user)} />
                <Action.Push
                  title="Modify User"
                  icon={Icon.Pencil}
                  target={<ModifyUser user={user} onUserModified={getFromApi} />}
                />
                <Action.Push
                  title="Change User ACL"
                  icon={Icon.Lock}
                  target={<ChangeUserACL user={user} onACLChanged={getFromApi} />}
                />
                <ActionPanel.Section>
                  <Action
                    title="Delete User"
                    icon={Icon.DeleteDocument}
                    onAction={() => confirmAndDelete(user)}
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
            title="Create User"
            icon={Icon.AddPerson}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create User"
                  icon={Icon.AddPerson}
                  target={<CreateUser onUserCreated={getFromApi} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
