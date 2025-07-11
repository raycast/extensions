import { FormValidation, getAvatarIcon, MutatePromise, useCachedPromise, useForm } from "@raycast/utils";
import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useContext } from "react";
import { sdk, SDKContext } from "./sdk";

export default function Users() {
  const sdks = useContext(SDKContext);
  const {
    isLoading,
    data: users,
    error,
    mutate,
  } = useCachedPromise(
    async () => {
      const res = await sdks.users.list();
      return res.users;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {!isLoading && !users.length && !error ? (
        <List.EmptyView
          title="Create your first user"
          description="Need a hand? Learn more in our documentation."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.AddPerson} title="Create User" target={<CreateUser mutate={mutate} />} />
              <Action.OpenInBrowser
                title="Documentation"
                url="https://appwrite.io/docs/references/cloud/server-nodejs/users"
              />
            </ActionPanel>
          }
        />
      ) : (
        users.map((user) => (
          <List.Item
            key={user.$id}
            icon={getAvatarIcon(user.name)}
            title={user.name}
            subtitle={user.targets[0].identifier}
            accessories={[{ tag: user.emailVerification ? "Verified" : "Unverified" }]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.AddPerson} title="Create User" target={<CreateUser mutate={mutate} />} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateUser({ mutate }: { mutate: MutatePromise<sdk.Models.User<sdk.Models.Preferences>[]> }) {
  type FormValues = {
    userId: string;
    name: string;
    email: string;
    phone: string;
    password: string;
  };
  const { pop } = useNavigation();
  const { users } = useContext(SDKContext);
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const { userId, email, phone, password, name } = values;
      const toast = await showToast(Toast.Style.Animated, "Creating", values.userId);
      try {
        await mutate(users.create(userId, email, phone, password, name));
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      userId: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.AddPerson} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="User ID"
        placeholder="Enter ID"
        info="Allowed characters: alphanumeric, non-leading hyphen, underscore, period"
        {...itemProps.userId}
      />
      <Form.TextField
        title="Name (optional)"
        placeholder="Enter name"
        info="User name. Max length: 128 chars."
        {...itemProps.name}
      />
      <Form.TextField title="Email (optional)" placeholder="Enter email" {...itemProps.email} />
      <Form.TextField
        title="Phone (optional)"
        placeholder="Enter phone"
        info="Format this number with a leading '+' and a country code, e.g., +16175551212."
        {...itemProps.phone}
      />
      <Form.PasswordField
        title="Password (optional)"
        placeholder="Enter password"
        info="Plain text user password. Must be at least 8 chars."
        {...itemProps.password}
      />
    </Form>
  );
}
