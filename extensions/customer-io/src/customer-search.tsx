import { useState } from "react";
import { List, ActionPanel, Action, showToast, Toast, Icon, getPreferenceValues, open, Color } from "@raycast/api";
import { getCustomersByEmail, CustomerProfile } from "./api";
import CustomerDetail from "./customer-detail";

export default function CustomerSearch() {
  const preferences = getPreferenceValues<{ workspace_id?: string }>();
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  async function search(text: string) {
    if (!text || text.length < 3) {
      setCustomers([]);
      return;
    }

    setLoading(true);
    try {
      const results = await getCustomersByEmail(text);
      setCustomers(results);
    } catch (error) {
      showToast({
        title: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search by name, email..."
      searchText={searchText}
      onSearchTextChange={(text) => {
        setSearchText(text);
        search(text);
      }}
      throttle
    >
      {customers.length === 0 && searchText.length >= 3 && !loading ? (
        <List.EmptyView
          icon={Icon.Person}
          title="No customers found"
          description="Enter exact email or customer ID. Partial search is not supported by Customer.io API."
        />
      ) : (
        customers.map((customer) => (
          <List.Item
            key={customer.id}
            icon={{ source: Icon.Person, tintColor: Color.Green }}
            title={customer.email || customer.id}
            subtitle={customer.cio_id ? `CIO: ${customer.cio_id}` : undefined}
            accessories={[
              {
                tag: {
                  value: customer.unsubscribed ? "Unsubscribed" : "Subscribed",
                  color: customer.unsubscribed ? Color.Red : Color.Green,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="View Profile" icon={Icon.Eye} target={<CustomerDetail id={customer.id} />} />
                <Action
                  title="Open in Customer.io"
                  icon={Icon.Globe}
                  onAction={() => {
                    if (!preferences.workspace_id) {
                      showToast({
                        title: "Workspace ID not configured",
                        message: "Please set your Workspace ID in Raycast extension preferences",
                        style: Toast.Style.Failure,
                      });
                      return;
                    }
                    const url = `https://fly.customer.io/workspaces/${preferences.workspace_id}/people/${customer.id}`;
                    open(url);
                  }}
                />
                {customer.email && (
                  <Action.CopyToClipboard
                    title="Copy Email"
                    content={customer.email}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
