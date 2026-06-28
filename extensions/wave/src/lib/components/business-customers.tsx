import { List, ActionPanel, Icon, Action, Keyboard, confirmAlert, Alert } from "@raycast/api";
import { useCachedState, showFailureToast } from "@raycast/utils";
import { HELP_LINKS } from "../config";
import { Business } from "../types";
import { getCustomerJoinedName } from "../utils";
import { useGetBusinessCustomers, deleteCustomer } from "../wave";
import AddCustomer from "./add-customer";
import CustomerStatement from "./customer-statement";
import OpenInWave from "./open-in-wave";

export default function BusinessCustomers({ business }: { business: Business }) {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-customer-details", false);

  const { isLoading, data: customers, revalidate, mutate } = useGetBusinessCustomers(business.id);
  const isEmpty = !isLoading && !customers.length;

  return (
    <List isLoading={isLoading} isShowingDetail={!isEmpty && isShowingDetail} searchBarPlaceholder="Search customer">
      {isEmpty ? (
        <List.EmptyView
          icon={{ source: "user.png", tintColor: { light: "", dark: "#000" } }}
          title="All your customers in one place"
          description="Save time creating invoices by adding customer details now, then track their payments with the Income by Customer report"
          actions={
            <ActionPanel>
              <OpenInWave title="Add a customer" url={HELP_LINKS.AddCustomer} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Businesses / ${business.name} / Customers`}>
          {customers.map((customer) => {
            return (
              <List.Item
                key={customer.id}
                icon="no-user.png"
                title={customer.name}
                subtitle={isShowingDetail ? undefined : getCustomerJoinedName(customer)}
                accessories={
                  isShowingDetail ? undefined : [{ text: customer.email }, { date: new Date(customer.modifiedAt) }]
                }
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Created At"
                          text={new Date(customer.createdAt).toISOString()}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Modified At"
                          text={new Date(customer.modifiedAt).toISOString()}
                        />
                        <List.Item.Detail.Metadata.Label title="Customer" text={customer.name} />
                        <List.Item.Detail.Metadata.Label
                          title="Name"
                          text={getCustomerJoinedName(customer)}
                          icon={!getCustomerJoinedName(customer) ? Icon.Minus : undefined}
                        />
                        {customer.website ? (
                          <List.Item.Detail.Metadata.Link
                            title="Website"
                            text={customer.website}
                            target={customer.website}
                          />
                        ) : (
                          <List.Item.Detail.Metadata.Label title="Website" icon={Icon.Minus} />
                        )}
                        {customer.email ? (
                          <List.Item.Detail.Metadata.Link
                            title="Email"
                            text={customer.email}
                            target={`mailto:${customer.email}`}
                          />
                        ) : (
                          <List.Item.Detail.Metadata.Label title="Email" icon={Icon.Minus} />
                        )}
                        {customer.phone ? (
                          <List.Item.Detail.Metadata.Link
                            title="Phone"
                            text={customer.phone}
                            target={`tel:${customer.phone}`}
                          />
                        ) : (
                          <List.Item.Detail.Metadata.Label title="Phone" icon={Icon.Minus} />
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      icon={Icon.AppWindowSidebarLeft}
                      title="Toggle Details"
                      onAction={() => setIsShowingDetail((prev) => !prev)}
                    />
                    <Action.Push
                      icon={Icon.Paragraph}
                      title="View Customer Statement"
                      target={
                        <CustomerStatement
                          businessId={business.id}
                          customers={customers}
                          initialCustomerId={customer.id}
                        />
                      }
                    />
                    <Action.Push
                      icon={Icon.AddPerson}
                      title="Add Customer"
                      target={<AddCustomer businessId={business.id} onCreate={revalidate} />}
                      shortcut={Keyboard.Shortcut.Common.New}
                    />
                    <Action
                      icon={Icon.RemovePerson}
                      title="Delete Customer"
                      onAction={async () => {
                        await confirmAlert({
                          title: "Delete Customer",
                          message: "Are you sure you want to delete this customer? This action can't be undone.",
                          primaryAction: {
                            style: Alert.ActionStyle.Destructive,
                            title: "Delete",
                            async onAction() {
                              try {
                                await mutate(deleteCustomer(customer.id), {
                                  optimisticUpdate(data) {
                                    return data.filter((c) => c.id !== customer.id);
                                  },
                                });
                              } catch (error) {
                                await showFailureToast(error);
                              }
                            },
                          },
                        });
                      }}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      style={Action.Style.Destructive}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
