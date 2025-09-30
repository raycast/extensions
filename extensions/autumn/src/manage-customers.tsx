import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { autumn, AUTUMN_LIMIT } from "./autumn";

export default function ManageCustomers() {
  const {
    isLoading,
    data: customers,
    error,
    revalidate,
  } = useCachedPromise(
    async () => {
      const { data, error } = await autumn.customers.list({ limit: AUTUMN_LIMIT });
      if (error) throw new Error(error.message);
      return data.list;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {!isLoading && !customers.length && error ? (
        <List.EmptyView
          description="Create your first customer by interacting with an Autumn function via the API."
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.AddPerson}
                title="Create Customer"
                target={<CreateCustomer />}
                onPop={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : (
        customers.map((customer) => (
          <List.Item
            key={customer.id}
            icon={Icon.PersonCircle}
            title={customer.name ?? ""}
            subtitle={customer.email ?? ""}
            accessories={[
              { text: customer.id },
              {
                date: new Date(customer.created_at),
                tooltip: `Created At: ${new Date(customer.created_at).toDateString()}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.AddPerson}
                  title="Create Customer"
                  target={<CreateCustomer />}
                  onPop={revalidate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateCustomer() {
  const { pop } = useNavigation();
  type CreateCustomer = {
    name: string;
    id: string;
    email: string;
  };
  const { handleSubmit, itemProps, values } = useForm<CreateCustomer>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name || values.email || values.id);
      try {
        const { error } = await autumn.customers.create(values);
        if (error) throw new Error(error.message);
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
      id(value) {
        if (!value && !values.email) return "ID or email is required";
      },
      email(value) {
        if (!value && !values.id) return "ID or email is required";
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.AddPerson} title="Create Customer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.TextField title="ID" {...itemProps.id} info="Your unique identifier for the customer" />
      <Form.TextField title="Email" {...itemProps.email} />
    </Form>
  );
}
