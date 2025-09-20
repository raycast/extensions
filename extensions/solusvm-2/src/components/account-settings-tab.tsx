import { Detail, ActionPanel, Action, Icon, showToast, Toast, Form, List, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { callApi } from "../api";
import { UserResource } from "../types";

export default function AccountSettingsTab({ user }: { user?: UserResource }) {
  return (
    <List.Item
      icon={Icon.Gear}
      title="Settings"
      detail={
        <List.Item.Detail
          metadata={
            user && (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="ID" text={user.id.toString()} />
                <List.Item.Detail.Metadata.Label title="Email" text={user.email} />
                <List.Item.Detail.Metadata.TagList title="Roles">
                  {user.roles.map((role) => (
                    <Detail.Metadata.TagList.Item key={role.id} text={role.name} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
      actions={
        user && (
          <ActionPanel>
            <Action.Push icon={Icon.Pencil} title="Update" target={<UpdateSettings user={user} />} />
          </ActionPanel>
        )
      }
    />
  );
}

function UpdateSettings({ user }: { user: UserResource }) {
  const { pop } = useNavigation();
  type FormValues = {
    password: string;
    language_id: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Updating account");
      try {
        await callApi("account", {
          method: "PATCH",
          body: values,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Updated account";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not update account";
        toast.message = `${error}`;
      }
    },
    validation: {
      password(value) {
        if (!value) return "The item is required";
        if (value.length < 8) return "Must be at least 8 characters";
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Email" text={user.email} />
      <Form.PasswordField
        title="Password"
        placeholder="Hunter2!"
        info="8 characters, 1 uppercase letter, 1 number"
        {...itemProps.password}
      />
      <Form.Dropdown title="Interface Language" {...itemProps.language_id}>
        <Form.Dropdown.Item
          icon={user.language.icon.url}
          title={user.language.name}
          value={user.language.id.toString()}
        />
      </Form.Dropdown>
    </Form>
  );
}
