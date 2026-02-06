import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { FeatureGuard } from "./components/FeatureGuard";
import { EmptyView } from "./components/EmptyView";
import { AccountSwitcherActions } from "./components/AccountSwitcher";
import { useCustomers } from "./lib/hooks/useCustomers";

export default function ViewCustomers() {
  return (
    <FeatureGuard feature="customers">
      {(apiKey, accountName) => (
        <CustomersList apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function CustomersList({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { data: customers, isLoading } = useCustomers(apiKey);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Mercury - ${accountName}`}
      searchBarPlaceholder="Search customers..."
    >
      {!isLoading && customers && customers.length === 0 && (
        <EmptyView
          title="No Customers"
          description="No customers found"
          icon={Icon.PersonCircle}
        />
      )}
      <List.Section
        title="Customers"
        subtitle={`${(customers ?? []).length} customers`}
      >
        {(customers ?? []).map((customer) => (
          <List.Item
            key={customer.id}
            title={customer.name}
            subtitle={customer.email}
            icon={{ source: Icon.PersonCircle, tintColor: Color.Blue }}
            accessories={[
              ...(customer.deletedAt
                ? [{ tag: { value: "Deleted", color: Color.Red } }]
                : []),
            ]}
            keywords={[customer.name, customer.email]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Name"
                    content={customer.name}
                  />
                  <Action.CopyToClipboard
                    title="Copy Email"
                    content={customer.email}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Customer Id"
                    content={customer.id}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <AccountSwitcherActions />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}