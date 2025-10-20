import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { autumn, AUTUMN_LIMIT } from "./autumn";
import CreateCustomer from "./components/create-customer";

export default function ManageCustomers() {
  const {
    isLoading,
    data: customers,
    error,
    mutate,
    pagination,
  } = useCachedPromise(
    () => async (options) => {
      const { data, error } = await autumn.customers.list({ limit: AUTUMN_LIMIT, offset: options.page*AUTUMN_LIMIT});
      if (error) throw new Error(error.message);
      return {
        data: data.list,
        hasMore: data.total===data.limit
      }
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
                {customer.id && <Action.Push icon={Icon.Person} title="Customer Details" target={<CustomerDetails customerId={customer.id as string} />} />}
                <Action.Push
                  icon={Icon.AddPerson}
                  title="Create Customer"
                  target={<CreateCustomer onCreate={mutate} />}
                />
                {customer.id && <Action icon={Icon.RemovePerson} title="Delete Customer" onAction={() => confirmAlert({
                  title: "Delete Customer",
                  message: "Are you sure you want to delete this customer in Autumn? This action cannot be undone.",
                  primaryAction: {
                    style: Alert.ActionStyle.Destructive,
                    title: "Delete",
                    async onAction() {
                      const delete_in_stripe = await confirmAlert({
                        title: "Select whether to delete this customer in Stripe as well.",
                        dismissAction: {
                          title: "Delete in Autumn only"
                        },
                        primaryAction: {
                          style: Alert.ActionStyle.Destructive,
                          title: "Delete in Autumn and Stripe"
                        },
                        rememberUserChoice: true
                      });
                        const customerId = customer.id as string;
                        const toast = await showToast(Toast.Style.Animated, "Deleting", customerId);
                        try {
                          await mutate(
                            autumn.customers.delete(customerId, {
                              delete_in_stripe
                            }).then(({error}) => {
                                if (error) throw new Error(error.message);
                            }), {
                              optimisticUpdate(data) {
                                return data.filter(c => c.id!==customer.id)
                              },
                              shouldRevalidateAfter: false
                            }
                          )
                          toast.style = Toast.Style.Success;
                          toast.title = "Deleted";
                        } catch (error) {
                          toast.style = Toast.Style.Failure;
                          toast.title = "Failed";
                          toast.message = `${error}`;
                        }
                    }
                  }
                })} style={Action.Style.Destructive} shortcut={Keyboard.Shortcut.Common.Remove} />}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CustomerDetails({customerId}:{customerId:string}) {
  const {isLoading, data: customer} = useCachedPromise(async(id: string) => {
    const {data,error} = await autumn.customers.get(id);
    if (error) throw new Error(error.message);
    return data;
  }, [customerId])
  return <Detail isLoading={isLoading} metadata={customer&&<Detail.Metadata>
<Detail.Metadata.Label title="ID" text={customer.id || "N/A"} />
<Detail.Metadata.Label title="Name" text={customer.name || "None"} />
<Detail.Metadata.Label title="Email" text={customer.email || "None"} />
<Detail.Metadata.Label title="Fingerprint" text={customer.fingerprint || "None"} />
  </Detail.Metadata>} />
}

