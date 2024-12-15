import {
  ActionPanel,
  Action,
  List,
  Icon,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
  Form,
  useNavigation,
  Keyboard,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState } from "react";

import { modifyUser } from "./utils/api";
import { ModifyUserRequest } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";
import { getFavicon, useForm } from "@raycast/utils";
import { callApi, useUsers } from "./utils/hooks";

export default function ListUsers() {
  const [filter, setFilter] = useState("");

  const { isLoading, data: users, error, revalidate, mutate } = useUsers();
  const filteredUsers = !filter ? users : users.filter((user) => user.split("@")[1] === filter);

  const handleDelete = async (user: string) => {
    if (
      await confirmAlert({
        title: `Delete user ${user}?`,
        message: "This action cannot be undone. All mail and other data will be deleted.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast(Toast.Style.Animated, "Deleting User");
      try {
        await mutate(
          callApi("deleteUser", {
            body: {
              userName: user,
            },
          }),
          {
            optimisticUpdate(data) {
              return data.filter((u) => u !== user);
            },
          },
        );
        toast.style = Toast.Style.Success;
        toast.title = "User Deleted";
        toast.message = "USER: " + user;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = (error as Error).cause as string;
        toast.message = (error as Error).message;
      }
    }
  };

  return error ? (
    <ErrorComponent error={error.message} />
  ) : (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for user..."
      searchBarAccessory={
        <List.Dropdown tooltip="Select domain" onChange={setFilter}>
          <List.Dropdown.Item title="All Domains" value="" icon={Icon.Dot} />
          {Array.from(new Set(users.map((user) => user.split("@")[1]).flat())).map((domainName) => (
            <List.Dropdown.Item
              key={domainName}
              title={domainName}
              value={domainName}
              icon={getFavicon(`https://${domainName}`, { fallback: Icon.List })}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title={`${filteredUsers.length} users`}>
        {filteredUsers.map((user) => (
          <List.Item
            key={user}
            icon={Icon.Person}
            title={user}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy User to Clipboard" icon={Icon.Clipboard} content={user} />
                <Action.Push
                  title="Modify User"
                  icon={Icon.Pencil}
                  target={<ModifyUser user={user} onUserModified={revalidate} />}
                />
                <Action.CopyToClipboard
                  title="Copy List of Users"
                  icon={Icon.CopyClipboard}
                  content={filteredUsers.join()}
                />
                {!isLoading && (
                  <ActionPanel.Section>
                    <Action
                      title="Create User"
                      icon={Icon.AddPerson}
                      onAction={async () => {
                        await launchCommand({
                          name: "create-user",
                          type: LaunchType.UserInitiated,
                        });
                      }}
                      shortcut={Keyboard.Shortcut.Common.New}
                    />
                    <Action
                      title="Delete User"
                      onAction={() => handleDelete(user)}
                      icon={Icon.DeleteDocument}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      style={Action.Style.Destructive}
                    />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!isLoading && (
        <List.Section title="Commands">
          <List.Item
            title="Add New User"
            icon={{ source: Icon.Plus }}
            actions={
              <ActionPanel>
                <Action
                  title="Add New User"
                  icon={Icon.AddPerson}
                  onAction={async () => {
                    await launchCommand({ name: "create-user", type: LaunchType.UserInitiated });
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type ModifyUserProps = {
  user: string;
  onUserModified: () => void;
};
function ModifyUser({ user, onUserModified }: ModifyUserProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<ModifyUserRequest>({
    async onSubmit(values) {
      setIsLoading(true);

      const params = { ...values, userName: user };
      if (!values.newUserName) delete params.newUserName;
      if (!values.newPassword) delete params.newPassword;

      const response = await modifyUser({ ...params });
      if (response.type === "success") {
        await showToast(Toast.Style.Success, "User Modified", "USER: " + values.userName);
        onUserModified();
        pop();
      }
      setIsLoading(false);
    },
  });

  return (
    <Form
      navigationTitle="Modify User"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Form" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="User" text={user} />
      <Form.Separator />
      <Form.TextField
        title="New Username"
        placeholder="leave blank to keep it unchanged"
        {...itemProps.newUserName}
        info={`Full new username, e.g. "user@domain.com"`}
      />
      <Form.PasswordField
        title="New Password"
        placeholder="leave blank to keep it unchanged"
        {...itemProps.newPassword}
        info="New password for user"
      />
      <Form.Checkbox
        label="Enable Search Indexing"
        {...itemProps.enableSearchIndexing}
        info="Whether search indexing should be enabled for this user. Indexes may take some time after enabling to be created."
      />
      <Form.Checkbox
        label="Enable Password Reset"
        {...itemProps.enablePasswordReset}
        info="Whether this user can have their password reset."
      />
      <Form.Checkbox
        label="Require 2FA"
        {...itemProps.requireTwoFactorAuthentication}
        info="Whether this user requires 2FA for login."
      />
    </Form>
  );
}
