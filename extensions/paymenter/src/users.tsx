import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { paymenter } from "./config";
import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import OpenInPaymenter from "./open-in-paymenter";

export default function Users() {
  const {
    isLoading,
    data: users,
    mutate,
  } = useCachedPromise(
    async () => {
      const result = await paymenter.users.list();
      return result.data;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {users.map((user) => (
        <List.Item
          key={user.id}
          icon={Icon.Person}
          title={user.attributes.email}
          subtitle={[user.attributes.first_name, user.attributes.last_name].filter(Boolean).join(" ")}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.AddPerson} title="New User" target={<NewUser />} onPop={mutate} />
              <OpenInPaymenter route={`users/${user.id}/edit`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function NewUser() {
  const { pop } = useNavigation();
  type FormValues = {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.email);
      try {
        await paymenter.users.create(values);
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
      first_name: FormValidation.Required,
      last_name: FormValidation.Required,
      email: FormValidation.Required,
      password: FormValidation.Required,
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
      <Form.TextField title="First name" {...itemProps.first_name} />
      <Form.TextField title="Last name" {...itemProps.last_name} />
      <Form.TextField title="Email" {...itemProps.email} />
      <Form.PasswordField title="Password" {...itemProps.password} />
    </Form>
  );
}
