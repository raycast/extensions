import { Action, ActionPanel, Color, Form, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import useVultrPaginated from "./lib/hooks/use-vultr-paginated";
import { AddUser, type UpdateUser, User } from "./lib/types/user";
import { FormValidation, useForm } from "@raycast/utils";
import useVultr from "./lib/hooks/use-vultr";
import { ACLs } from "./lib/constants";
import { useState } from "react";

export default function Users() {
  const { isLoading, data: users, pagination, revalidate } = useVultrPaginated<User>("users");

  return (
    <List isLoading={isLoading} pagination={pagination} isShowingDetail>
      {!isLoading && !users.length && (
        <List.EmptyView
          title="No Users"
          description="Add new users with full or limited access to your account."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add New User"
                icon={Icon.AddPerson}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<AddNewUser onUserAdded={revalidate} />}
              />
            </ActionPanel>
          }
        />
      )}
      {users.map((user) => (
        <List.Item
          key={user.id}
          icon={Icon.Person}
          title={user.name}
          subtitle={user.email}
          accessories={[{ tag: { value: "API", color: user.api_enabled ? Color.Green : Color.Red } }]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="ACLs">
                    {user.acls.map((acl) => (
                      <List.Item.Detail.Metadata.TagList.Item key={acl} text={ACLs[acl as keyof typeof ACLs]} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Update User"
                icon={Icon.Pencil}
                target={<UpdateUser user={user} onUserUpdated={revalidate} />}
              />
              <ActionPanel.Section>
                <Action.Push
                  title="Add New User"
                  icon={Icon.AddPerson}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<AddNewUser onUserAdded={revalidate} />}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type UpdateUserProps = {
  user: User;
  onUserUpdated: () => void;
};
function UpdateUser({ user, onUserUpdated }: UpdateUserProps) {
  const [execute, setExecute] = useState(false);

  const { itemProps, values, handleSubmit } = useForm<UpdateUser>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      name: user.name,
      email: user.email,
      api_enabled: user.api_enabled,
      acls: user.acls,
    },
  });

  const { pop } = useNavigation();

  const { isLoading } = useVultr(`users/${user.id}`, {
    method: "PATCH",
    body: values,
    execute,
    onData() {
      onUserUpdated();
      pop();
    },
    onError() {
      setExecute(false);
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Update User" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Name" {...itemProps.name} />
      <Form.TextField title="Email" placeholder="Email" {...itemProps.email} />
      <Form.PasswordField title="Password" placeholder="hunter2" {...itemProps.password} />
      <Form.Checkbox label="API Enabled" {...itemProps.api_enabled} />
      <Form.TagPicker title="ACLs" placeholder="ACL" {...itemProps.acls}>
        {Object.entries(ACLs).map(([key, val]) => (
          <Form.TagPicker.Item key={key} title={val} value={key} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

type AddNewUserProps = {
  onUserAdded: () => void;
};
function AddNewUser({ onUserAdded }: AddNewUserProps) {
  const [execute, setExecute] = useState(false);

  const { itemProps, values, handleSubmit } = useForm<AddUser>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      api_enabled: true,
    },
    validation: {
      name: FormValidation.Required,
      email: FormValidation.Required,
      password: FormValidation.Required,
    },
  });

  const { pop } = useNavigation();

  const { isLoading } = useVultr<{ user: User }>("users", {
    method: "POST",
    body: values,
    execute,
    onData() {
      onUserAdded();
      pop();
    },
    onError() {
      setExecute(false);
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Add User" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="This will create a new https://my.vultr.com log in with limited privileges to manage your account" />
      <Form.TextField title="Name" placeholder="Name" {...itemProps.name} />
      <Form.TextField title="Email" placeholder="Email" {...itemProps.email} />
      <Form.PasswordField title="Password" placeholder="hunter2" {...itemProps.password} />
      <Form.Checkbox label="API Enabled" {...itemProps.api_enabled} />
      <Form.TagPicker title="ACLs" placeholder="ACL" {...itemProps.acls}>
        {Object.entries(ACLs).map(([key, val]) => (
          <Form.TagPicker.Item key={key} title={val} value={key} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
