import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { formatMoney } from "../core/money";
import { looksLikeEmail, useCustomerSales, useCustomerSearch } from "../hooks/data";
import { useProviders } from "../hooks/useProviders";
import { ProGate } from "../license/gate";
import { Customer, PROVIDER_IDS, PROVIDER_LABELS } from "../providers/types";
import { CommonActions, NoProvidersEmptyView, ProviderErrorItem, providerIcon } from "../ui/components";
import { sectionTitle } from "../ui/format";
import { SaleItem } from "../ui/SaleItem";
import { SHORTCUTS } from "../ui/shortcuts";

function CustomerOrders(props: { customer: Customer }) {
  const { customer } = props;
  const { data, isLoading, revalidate } = useCustomerSales(customer);
  const sales = data ?? [];
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={sales.length > 0}
      navigationTitle={`${customer.email} · ${PROVIDER_LABELS[customer.provider]}`}
    >
      <List.EmptyView
        title="No Orders Found"
        description={`No orders for ${customer.email} in ${PROVIDER_LABELS[customer.provider]}.`}
      />
      <List.Section title={sectionTitle("Orders", sales.length)}>
        {sales.map((sale) => (
          <SaleItem key={sale.id} sale={sale} onRefresh={revalidate} />
        ))}
      </List.Section>
    </List>
  );
}

function CustomerItem(props: { customer: Customer }) {
  const c = props.customer;
  const label = PROVIDER_LABELS[c.provider];
  return (
    <List.Item
      icon={providerIcon(c.provider)}
      title={c.email}
      subtitle={c.name}
      accessories={[
        ...(c.totalSpent ? [{ text: formatMoney(c.totalSpent), tooltip: "Total spent" }] : []),
        ...(c.createdAt ? [{ date: c.createdAt, tooltip: "Customer since" }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="View Orders" icon={Icon.Sidebar} target={<CustomerOrders customer={c} />} />
          <Action.OpenInBrowser
            title={`View in ${label} Dashboard`}
            url={c.url}
            icon={Icon.Globe}
            shortcut={SHORTCUTS.openDashboard}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Customer Email" content={c.email} shortcut={SHORTCUTS.copyEmail} />
            <Action.CopyToClipboard title="Copy Customer ID" content={c.id} shortcut={SHORTCUTS.copy} />
          </ActionPanel.Section>
          <CommonActions />
        </ActionPanel>
      }
    />
  );
}

function SearchCustomers() {
  const providers = useProviders();
  const [text, setText] = useState("");
  const isEmail = looksLikeEmail(text);
  const { data, isLoading } = useCustomerSearch(text, providers.activeIds, !providers.isLoading);
  const results = isEmail ? (data?.results ?? []) : [];
  const customers = isEmail ? (data?.customers ?? []) : [];

  return (
    <List
      isLoading={(isEmail && isLoading) || providers.isLoading}
      navigationTitle="Search Customers"
      searchBarPlaceholder="Customer email address"
      onSearchTextChange={setText}
      throttle
      filtering={false}
    >
      {providers.configured.length === 0 ? (
        <NoProvidersEmptyView />
      ) : isEmail ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Customers Found"
          description={`Nobody with ${text.trim()}.`}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Envelope}
          title="Type a Customer's Email Address"
          description="Stripe, Lemon Squeezy, Gumroad and Paddle match emails exactly."
        />
      )}
      {results.map((r) => (r.ok ? null : <ProviderErrorItem key={r.provider} provider={r.provider} error={r.error} />))}
      {PROVIDER_IDS.map((id) => {
        const items = customers.filter((c) => c.provider === id);
        if (items.length === 0) return null;
        return (
          <List.Section key={id} title={sectionTitle(PROVIDER_LABELS[id], items.length)}>
            {items.map((c) => (
              <CustomerItem key={`${c.provider}-${c.id}`} customer={c} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

export default function Command() {
  return (
    <ProGate feature="Customer search" navigationTitle="Search Customers">
      <SearchCustomers />
    </ProGate>
  );
}
