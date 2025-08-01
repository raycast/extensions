import dayjs from "dayjs";
import relatimeTime from "dayjs/plugin/relativeTime";
import { API_URL, headers, parseResponse, useKeygenPaginated } from "./keygen";
import { User, UserRole } from "./interfaces";
import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import OpenInKeygen from "./open-in-keygen";
import { FormValidation, useForm } from "@raycast/utils";
import { USER_STATUS_COLOR } from "./config";
dayjs.extend(relatimeTime);

export default function Users() {
  const { isLoading, data: users, pagination, revalidate, error } = useKeygenPaginated<User>("users");

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {!isLoading && !users.length && !error ? (
        <List.EmptyView
          description="No results"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.AddPerson} title="New User" target={<NewUser onNew={revalidate} />} />
            </ActionPanel>
          }
        />
      ) : (
        users.map((user) => (
          <List.Item
            key={user.id}
            icon={{
              value: { source: Icon.Person, tintColor: USER_STATUS_COLOR[user.attributes.status] },
              tooltip: user.attributes.status,
            }}
            title={user.id.slice(0, 8)}
            subtitle={user.attributes.email}
            actions={
              <ActionPanel>
                <OpenInKeygen route={`users/${user.id}`} />
                <Action.Push icon={Icon.AddPerson} title="New User" target={<NewUser onNew={revalidate} />} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function NewUser({ onNew }: { onNew: () => void }) {
  const { pop } = useNavigation();
  
  interface FormValues {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
    group: string;
  }
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating User", values.email);

      const attributes: Partial<User["attributes"]> = {
        email: values.email,
        role: values.role as UserRole,
        ...(values.firstName && { name: values.firstName }),
        ...(values.lastName && { name: values.lastName }),
        ...(values.password && { name: values.password })
      };
      
      const body = {
        data: {
          type: "users",
          attributes,
        },
      };

      try {
        const response = await fetch(API_URL + "licenses", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        await parseResponse(response);
        toast.style = Toast.Style.Success;
        toast.title = "Created License";
        onNew();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      role: "user"
    },
    validation: {
      email: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.AddPerson} title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Attributes" />
      <Form.TextField
        title="First Name"
        placeholder="First Name"
        {...itemProps.firstName}
      />
      <Form.TextField
        title="Last Name"
        placeholder="Last Name"
        {...itemProps.lastName}
      />
      <Form.TextField
        title="Email"
        placeholder="Email"
        {...itemProps.email}
      />
      <Form.PasswordField title="Password" placeholder="Password" {...itemProps.password} />
      <Form.Dropdown title="Role" {...itemProps.role}>
        <Form.Dropdown.Section title="Product Users">
          <Form.Dropdown.Item title="User" value="user" />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Administrators">
          <Form.Dropdown.Item title="Support Agent" value="support-agent" />
          <Form.Dropdown.Item title="Sales Agent" value="sales-agent" />
          <Form.Dropdown.Item title="Developer"value="developer" />
          <Form.Dropdown.Item title="Read Only" value="read-only" />
          <Form.Dropdown.Item title="Root" value="admin" />
        </Form.Dropdown.Section>
      </Form.Dropdown>
    </Form>
  );
}
