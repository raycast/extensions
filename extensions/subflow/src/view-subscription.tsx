import { Action, ActionPanel, Color, Icon, Image, List, openExtensionPreferences } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useSubscriptions } from "./hooks/useSubscriptions";
import { formatAmount, formatDate, getSubscriptionsForMonth, monthValueToLabel, stepMonth } from "./utils/date";
import { getServiceIcon } from "./utils/icons";
import { Subscription } from "./utils/graphql";
import { SUBFLOW_URL, SUBFLOW_API_KEY_URL } from "./utils/constants";

interface ListItem {
  subscription: Subscription;
  paymentDate: Date;
  icon: Image.ImageLike;
}

type SortOrder = "date" | "amount" | "name";

function defaultMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getDateTag(paymentDate: Date, today: Date): { value: string; color: Color } | null {
  const payment = new Date(paymentDate);
  payment.setHours(0, 0, 0, 0);

  if (payment.getTime() === today.getTime()) return { value: "Today", color: Color.Orange };
  if (payment < today) return { value: "Paid", color: Color.Green };
  return null;
}

function sortItems(items: ListItem[], order: SortOrder): ListItem[] {
  return [...items].sort((a, b) => {
    if (order === "amount") return b.subscription.price - a.subscription.price;
    if (order === "name") return a.subscription.name.localeCompare(b.subscription.name);
    return a.paymentDate.getDate() - b.paymentDate.getDate();
  });
}

export default function ViewSubscription() {
  const { subscriptions, isLoading, error } = useSubscriptions();

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [items, setItems] = useState<ListItem[]>([]);
  const [iconsLoading, setIconsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>("date");

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (subscriptions.length === 0) {
      setItems([]);
      setIconsLoading(false);
      return;
    }

    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const filtered = getSubscriptionsForMonth(subscriptions, year, month);

    let cancelled = false;
    setIconsLoading(true);
    Promise.all(
      filtered.map(async ({ subscription, paymentDate }) => ({
        subscription,
        paymentDate,
        icon: (await getServiceIcon(subscription.name)) ?? Icon.CreditCard,
      })),
    )
      .then((result) => {
        if (!cancelled) {
          setItems(result);
          setIconsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIconsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [subscriptions, selectedMonth, isLoading]);

  const sortedItems = useMemo(() => sortItems(items, sortOrder), [items, sortOrder]);

  const navigationActions = useMemo(
    () => (
      <>
        <Action
          title="Next Month"
          icon={Icon.ArrowRight}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "]" }, Windows: { modifiers: ["ctrl"], key: "]" } }}
          onAction={() => setSelectedMonth((m) => stepMonth(m, 1))}
        />
        <Action
          title="Previous Month"
          icon={Icon.ArrowLeft}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "[" }, Windows: { modifiers: ["ctrl"], key: "[" } }}
          onAction={() => setSelectedMonth((m) => stepMonth(m, -1))}
        />
      </>
    ),
    [],
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Failed to Load Subscriptions"
          description={error.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser title="Get API Key" url={SUBFLOW_API_KEY_URL} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading || iconsLoading}
      navigationTitle={monthValueToLabel(selectedMonth)}
      filtering={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Sort By" onChange={(v) => setSortOrder(v as SortOrder)}>
          <List.Dropdown.Item title="Sort by Date" value="date" />
          <List.Dropdown.Item title="Sort by Amount" value="amount" />
          <List.Dropdown.Item title="Sort by Name" value="name" />
        </List.Dropdown>
      }
    >
      {sortedItems.length === 0 && !isLoading && !iconsLoading ? (
        <List.EmptyView
          title="No subscriptions"
          description="No payments due this month"
          icon={Icon.CreditCard}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Add Subscription"
                icon={Icon.Plus}
                url={`${SUBFLOW_URL}?action=create`}
                shortcut={{ macOS: { modifiers: ["cmd"], key: "n" }, Windows: { modifiers: ["ctrl"], key: "n" } }}
              />
              {navigationActions}
            </ActionPanel>
          }
        />
      ) : (
        sortedItems.map(({ subscription, paymentDate, icon }) => {
          const dateTag = getDateTag(paymentDate, today);
          return (
            <List.Item
              key={subscription.id}
              icon={icon}
              title={subscription.name}
              subtitle={formatDate(paymentDate)}
              accessories={[
                ...(dateTag ? [{ tag: dateTag }] : []),
                { tag: subscription.paymentCycle.charAt(0).toUpperCase() + subscription.paymentCycle.slice(1) },
                { tag: subscription.currency },
                { tag: formatAmount(subscription.price) },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Edit Subscription"
                    icon={Icon.Pencil}
                    url={`${SUBFLOW_URL}?action=edit&id=${subscription.id}`}
                  />
                  <Action.OpenInBrowser
                    title="Delete Subscription"
                    icon={Icon.Trash}
                    url={`${SUBFLOW_URL}?action=delete&id=${subscription.id}`}
                    shortcut={{ macOS: { modifiers: ["cmd"], key: "x" }, Windows: { modifiers: ["ctrl"], key: "x" } }}
                  />
                  <Action.OpenInBrowser
                    title="Add Subscription"
                    icon={Icon.Plus}
                    url={`${SUBFLOW_URL}?action=create`}
                    shortcut={{ macOS: { modifiers: ["cmd"], key: "n" }, Windows: { modifiers: ["ctrl"], key: "n" } }}
                  />
                  {navigationActions}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
