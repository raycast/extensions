import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { Customer, CustomerEvent, ExplorerClient, Subscription } from "../lib/explorer-api";
import { demoCustomers, demoEventsFor, demoPage, demoSubscriptionsFor } from "../lib/demo";
import { usePaged, useResource } from "../hooks/data";
import { CommonActions, Context, customerURL, dateLabel, Empty, More, readable, statusColor } from "./common";
import { customerEmail, customerName } from "../lib/customer-identity";
import { ProjectDropdown } from "./projects";

function SubscriptionMetadata({ subscription, title }: { subscription: Subscription; title: string }) {
  return (
    <>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title={title}>
        <List.Item.Detail.Metadata.TagList.Item
          text={readable(subscription.status)}
          color={statusColor(subscription.status)}
        />
        {subscription.environment === "sandbox" && (
          <List.Item.Detail.Metadata.TagList.Item text="Sandbox" color={Color.Orange} />
        )}
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label title="Access" text={subscription.gives_access ? "Granted" : "Not granted"} />
      <List.Item.Detail.Metadata.Label title="Renewal" text={readable(subscription.auto_renewal_status)} />
      {subscription.pending_payment && <List.Item.Detail.Metadata.Label title="Pending Payment" text="Yes" />}
      <List.Item.Detail.Metadata.Label
        title="Store"
        text={subscription.store === "rc_billing" ? "Web Billing" : readable(subscription.store)}
      />
      <List.Item.Detail.Metadata.Label title="Started" text={dateLabel(subscription.starts_at)} />
      <List.Item.Detail.Metadata.Label title="Period Ends" text={dateLabel(subscription.current_period_ends_at)} />
      {subscription.total_revenue_in_usd && (
        <List.Item.Detail.Metadata.Label
          title="Revenue (USD)"
          text={new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(
            subscription.total_revenue_in_usd.gross,
          )}
        />
      )}
    </>
  );
}
function SubscriptionIdentifiers({ subscription, prefix }: { subscription: Subscription; prefix: string }) {
  return (
    <>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title={`${prefix}Product ID`}
        text={subscription.product_id || "Promotional Subscription"}
      />
      <List.Item.Detail.Metadata.Label title={`${prefix}Subscription ID`} text={subscription.id} />
      <List.Item.Detail.Metadata.Label
        title={`${prefix}Store Transaction ID`}
        text={subscription.store_subscription_identifier}
      />
    </>
  );
}
function EventMetadata({ event }: { event: CustomerEvent }) {
  return (
    <>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title={readable(event.type.replace(/^PURCHASES_/, "").toLowerCase())}
        text={new Date(event.occurred_at || event.created_at).toLocaleString()}
      />
      {Object.entries(event.body || {})
        .filter(([, value]) => value !== null && ["string", "number", "boolean"].includes(typeof value))
        .map(([key, value]) => (
          <List.Item.Detail.Metadata.Label key={key} title={readable(key)} text={String(value)} />
        ))}
      <List.Item.Detail.Metadata.Label title="Event ID" text={event.id} />
    </>
  );
}

export function Customers({ context }: { context: Context }) {
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<Record<string, Customer>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const client = new ExplorerClient(context.apiKey);
  const customers = usePaged<Customer>(`${context.project.id}:customers:${query}:${context.demo}`, (next, signal) =>
    context.demo
      ? demoPage(
          demoCustomers.filter((customer) => JSON.stringify(customer).toLowerCase().includes(query.toLowerCase())),
        )
      : client.customers(context.project.id, query, next, signal),
  );
  const selected = customers.items.find((customer) => customer.id === selectedId) || customers.items[0];
  const key = `${context.project.id}:${selected?.id || "none"}:${context.demo}`;
  // Only the selected customer loads details. Changing selection cancels the old
  // requests; keyed hook results prevent another customer's data appearing here.
  const profile = useResource(`${key}:profile`, (signal) =>
    !selected || context.demo ? Promise.resolve(selected) : client.customer(context.project.id, selected.id, signal),
  );
  useEffect(() => {
    if (profile.data) {
      const loaded = profile.data;
      setProfiles((previous) => ({ ...previous, [`${context.project.id}:${loaded.id}`]: loaded }));
    }
  }, [profile.data, context.project.id]);
  const subscriptions = usePaged<Subscription>(`${key}:subscriptions`, (next, signal) =>
    !selected
      ? demoPage([])
      : context.demo
        ? demoPage(demoSubscriptionsFor(selected.id))
        : client.subscriptions(context.project.id, selected.id, "all", next, signal),
  );
  const customer = profile.data || (selected && profiles[`${context.project.id}:${selected.id}`]) || selected;
  function refresh() {
    customers.refresh();
    profile.refresh();
    subscriptions.refresh();
  }
  const displayName = customer?.attributes?.items.find((attribute) => attribute.name === "$displayName")?.value;
  const extraAttributes =
    customer?.attributes?.items.filter((attribute) => !["$email", "$displayName"].includes(attribute.name)) || [];
  const detail = customer ? (
    <List.Item.Detail
      isLoading={profile.loading}
      metadata={
        <List.Item.Detail.Metadata>
          {displayName && <List.Item.Detail.Metadata.Label title="Name" text={displayName} />}
          {customerEmail(customer) && <List.Item.Detail.Metadata.Label title="Email" text={customerEmail(customer)} />}
          <List.Item.Detail.Metadata.Label title="App User ID" text={customer.id} />
          {profile.error && <List.Item.Detail.Metadata.Label title="Profile Unavailable" text={profile.error} />}
          {subscriptions.items.map((subscription, index) => (
            <SubscriptionMetadata
              key={subscription.id}
              subscription={subscription}
              title={subscriptions.items.length > 1 ? `Subscription ${index + 1}` : "Subscription"}
            />
          ))}
          {!subscriptions.items.length && (
            <List.Item.Detail.Metadata.Label
              title="Subscriptions"
              text={subscriptions.error || (subscriptions.loading ? "Loading…" : "None")}
            />
          )}
          {!!subscriptions.items.length && subscriptions.error && (
            <List.Item.Detail.Metadata.Label title="Subscription Update Unavailable" text={subscriptions.error} />
          )}
          {subscriptions.next && (
            <List.Item.Detail.Metadata.Label title="More Subscriptions" text="Load more from Actions" />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Active Entitlements"
            text={customer.active_entitlements ? String(customer.active_entitlements.items.length) : "Not provided"}
          />
          {customer.active_entitlements?.items.map((entitlement) => (
            <List.Item.Detail.Metadata.Label
              key={entitlement.entitlement_id}
              title={entitlement.entitlement_id}
              text={entitlement.expires_at ? `Expires ${dateLabel(entitlement.expires_at)}` : "No expiry"}
            />
          ))}
          {customer.active_entitlements?.next_page && (
            <List.Item.Detail.Metadata.Label title="More Entitlements" text="Available in RevenueCat" />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="First Seen" text={dateLabel(customer.first_seen_at)} />
          <List.Item.Detail.Metadata.Label title="Last Seen" text={dateLabel(customer.last_seen_at)} />
          <List.Item.Detail.Metadata.Label title="Platform" text={readable(customer.last_seen_platform)} />
          {customer.last_seen_country && (
            <List.Item.Detail.Metadata.Label title="Country" text={customer.last_seen_country} />
          )}
          {customer.last_seen_app_version && (
            <List.Item.Detail.Metadata.Label title="App Version" text={customer.last_seen_app_version} />
          )}
          {!!extraAttributes.length && <List.Item.Detail.Metadata.Separator />}
          {extraAttributes.map((attribute) => (
            <List.Item.Detail.Metadata.Label key={attribute.name} title={attribute.name} text={attribute.value} />
          ))}
          {customer.attributes?.next_page && (
            <List.Item.Detail.Metadata.Label title="More Attributes" text="Available in RevenueCat" />
          )}
          {subscriptions.items.map((subscription, index) => (
            <SubscriptionIdentifiers
              key={subscription.id}
              subscription={subscription}
              prefix={subscriptions.items.length > 1 ? `Subscription ${index + 1} · ` : ""}
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  ) : undefined;
  return (
    <List
      navigationTitle="Customers"
      isLoading={customers.loading || profile.loading || subscriptions.loading}
      isShowingDetail
      onSelectionChange={setSelectedId}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      filtering={false}
      pagination={{
        pageSize: 50,
        hasMore: Boolean(customers.next) && !customers.error,
        onLoadMore: customers.loadMore,
      }}
      searchBarAccessory={<ProjectDropdown context={context} command="search-customers" />}
      searchBarPlaceholder="Search by exact email, app user ID, or transaction ID…"
    >
      <Empty
        loading={customers.loading}
        error={customers.error}
        title={query ? "No matching customers" : "No customers yet"}
        refresh={refresh}
      />
      <List.Section title={query ? "Search Results" : "Customers"}>
        {customers.items.map((record) => {
          const item = profiles[`${context.project.id}:${record.id}`] || record;
          const email = customerEmail(item);
          return (
            <List.Item
              key={item.id}
              id={item.id}
              title={customerName(record)}
              icon={{ source: Icon.PersonCircle, tintColor: Color.Blue }}
              detail={item.id === selected?.id ? detail : undefined}
              actions={
                <ActionPanel title={customerName(record)}>
                  {email && <Action.CopyToClipboard title="Copy Email" content={email} />}
                  <Action.CopyToClipboard title="Copy Customer ID" content={item.id} />
                  {subscriptions.next && (
                    <Action title="Load More Subscriptions" icon={Icon.CreditCard} onAction={subscriptions.loadMore} />
                  )}
                  <Action.Push
                    title="View Event History"
                    icon={Icon.Clock}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "opt"], key: "e" },
                      Windows: { modifiers: ["ctrl", "opt"], key: "e" },
                    }}
                    target={<Events context={context} customer={item} />}
                  />
                  <CommonActions
                    url={context.demo ? undefined : customerURL(context.project.id, item.id)}
                    refresh={refresh}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {customers.items.length > 0 && customers.error && <More {...customers} next={undefined} />}
    </List>
  );
}

function Events({ context, customer }: { context: Context; customer: Customer }) {
  const client = new ExplorerClient(context.apiKey);
  const events = usePaged<CustomerEvent>(
    `${context.project.id}:${customer.id}:events:${context.demo}`,
    (next, signal) =>
      context.demo
        ? demoPage(demoEventsFor(customer.id))
        : client.events(context.project.id, customer.id, next, signal),
  );
  return (
    <List
      navigationTitle={`${customerName(customer)} · Event History`}
      isLoading={events.loading}
      isShowingDetail
      searchBarPlaceholder="Filter events…"
      searchBarAccessory={<ProjectDropdown context={context} command="search-customers" />}
      pagination={{ pageSize: 50, hasMore: Boolean(events.next) && !events.error, onLoadMore: events.loadMore }}
    >
      <Empty loading={events.loading} error={events.error} title="No events found" refresh={events.refresh} />
      {[...events.items]
        .sort((a, b) => (b.occurred_at || b.created_at) - (a.occurred_at || a.created_at))
        .map((event) => (
          <List.Item
            key={event.id}
            id={event.id}
            title={readable(event.type.replace(/^PURCHASES_/, "").toLowerCase())}
            icon={{
              source: Icon.Clock,
              tintColor: /CANCEL|EXPIR|BILLING/.test(event.type) ? Color.Orange : Color.Green,
            }}
            accessories={[{ date: new Date(event.occurred_at || event.created_at) }]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <EventMetadata event={event} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Event JSON" content={JSON.stringify(event, null, 2)} />
                <CommonActions
                  url={context.demo ? undefined : customerURL(context.project.id, customer.id)}
                  refresh={events.refresh}
                />
              </ActionPanel>
            }
          />
        ))}
      {events.items.length > 0 && events.error && <More {...events} next={undefined} />}
    </List>
  );
}
