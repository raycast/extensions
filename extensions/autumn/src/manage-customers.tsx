import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { autumn, AUTUMN_LIMIT } from "./autumn";
import CreateCustomer from "./components/create-customer";
import DeleteCustomerAction from "./components/DeleteCustomerAction";

export default function ManageCustomers() {
  const {
    isLoading,
    data: customers,
    error,
    mutate,
    pagination,
  } = useCachedPromise(
    () => async (options) => {
      const { data, error } = await autumn.customers.list({ limit: AUTUMN_LIMIT, offset: options.page * AUTUMN_LIMIT });
      if (error) throw new Error(error.message);
      return {
        data: data.list,
        hasMore: data.total === data.limit,
      };
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {!isLoading && !customers.length && !error ? (
        <List.EmptyView
          description="Create your first customer by interacting with an Autumn function via the API."
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.AddPerson}
                title="Create Customer"
                target={<CreateCustomer onCreate={mutate} />}
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
                {customer.id && (
                  <Action.Push
                    icon={Icon.Person}
                    title="Customer Details"
                    target={<CustomerDetails customerId={customer.id as string} />}
                  />
                )}
                <Action.Push
                  icon={Icon.AddPerson}
                  title="Create Customer"
                  target={<CreateCustomer onCreate={mutate} />}
                />
                {customer.id && <DeleteCustomerAction customerId={customer.id as string} mutateCustomers={mutate} />}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CustomerDetails({ customerId }: { customerId: string }) {
  const { isLoading, data: customer } = useCachedPromise(
    async (id: string) => {
      const { data, error } = await autumn.customers.get(id);
      if (error) throw new Error(error.message);
      return data;
    },
    [customerId],
  );
  return (
    <Detail
      isLoading={isLoading}
      metadata={
        customer && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="ID" text={customer.id || "N/A"} />
            <Detail.Metadata.Label title="Name" text={customer.name || "None"} />
            <Detail.Metadata.Label title="Email" text={customer.email || "None"} />
            <Detail.Metadata.Label title="Fingerprint" text={customer.fingerprint || "None"} />
          </Detail.Metadata>
        )
      }
    />
  );
}
