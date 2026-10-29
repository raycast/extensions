import { Action, ActionPanel, Color, Icon, List, Toast, popToRoot, showToast } from "@raycast/api";
import { useState } from "react";
import { AddSubscriptionForm } from "./add-subscription";
import { SubscriptionDetail } from "./subscription-detail";
import { useSubscriptions } from "./storage";
import { confirmAndDeleteSubscription } from "./subscription-actions";
import { copyToClipboard, exportToFile } from "./export";
import { Subscription } from "./types";
import { CATEGORIES, formatCurrency, formatCycle, getSubscriptionIcon } from "./utils";

type SortKey = "name" | "amount" | "billingDay" | "category";

const ALL_CATEGORIES_VALUE = "__all__";
const CATEGORY_VALUE_PREFIX = "cat:";

// Dropdown values are either the ALL_CATEGORIES_VALUE sentinel or a prefixed
// category name, so a custom category literally named "all" filters correctly
function categoryFromDropdownValue(value: string): string | undefined {
  return value.startsWith(CATEGORY_VALUE_PREFIX) ? value.slice(CATEGORY_VALUE_PREFIX.length) : undefined;
}

function ExportSubmenu({ subscriptions }: { subscriptions: Subscription[] }) {
  return (
    <ActionPanel.Submenu
      title="Export Subscriptions"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
    >
      <Action title="Save as JSON" icon={Icon.Document} onAction={() => exportToFile(subscriptions, "json")} />
      <Action title="Save as CSV" icon={Icon.Document} onAction={() => exportToFile(subscriptions, "csv")} />
      <Action title="Copy as JSON" icon={Icon.Clipboard} onAction={() => copyToClipboard(subscriptions, "json")} />
      <Action title="Copy as CSV" icon={Icon.Clipboard} onAction={() => copyToClipboard(subscriptions, "csv")} />
    </ActionPanel.Submenu>
  );
}

const STATUS_ICON = {
  active: { source: Icon.CheckCircle, tintColor: Color.Green },
  paused: { source: Icon.Pause, tintColor: Color.Yellow },
};

export function SubscriptionList() {
  const { subscriptions, deleteSubscription, updateSubscription, isLoading } = useSubscriptions();
  const [categoryValue, setCategoryValue] = useState(ALL_CATEGORIES_VALUE);
  const [sortKey, setSortKey] = useState<SortKey>("billingDay");
  const selectedCategory = categoryFromDropdownValue(categoryValue);
  const categories = [
    ...CATEGORIES,
    ...[...new Set(subscriptions.map((s) => s.category))]
      .filter((category) => !CATEGORIES.includes(category))
      .sort((a, b) => a.localeCompare(b)),
  ];

  const filtered = subscriptions
    .filter((s) => !selectedCategory || s.category === selectedCategory)
    .sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "amount":
          return b.amount - a.amount;
        case "billingDay":
          return a.billingDay - b.billingDay;
        case "category":
          return a.category.localeCompare(b.category);
      }
    });

  const active = filtered.filter((s) => s.status === "active");
  const paused = filtered.filter((s) => s.status === "paused");

  const allIds = filtered.map((s) => s.id);

  function renderSection(items: typeof filtered, title: string) {
    if (items.length === 0) return null;
    return (
      <List.Section title={title} subtitle={`${items.length} subscription${items.length !== 1 ? "s" : ""}`}>
        {items.map((sub) => (
          <List.Item
            key={sub.id}
            icon={getSubscriptionIcon(sub)}
            title={sub.name}
            subtitle={sub.category}
            accessories={[
              {
                text: `${formatCurrency(sub.amount, sub.currency)} ${formatCycle(sub.billingCycle)}`,
                tooltip: sub.billingCycle,
              },
              { icon: STATUS_ICON[sub.status], tooltip: sub.status === "active" ? "Active" : "Paused" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={<SubscriptionDetail id={sub.id} allIds={allIds} />}
                />
                <Action.Push
                  title="Edit"
                  icon={Icon.Pencil}
                  target={<SubscriptionDetail id={sub.id} startEditing allIds={allIds} />}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <ActionPanel.Section>
                  <Action
                    title={sub.status === "active" ? "Pause" : "Resume"}
                    icon={sub.status === "active" ? Icon.Pause : Icon.Play}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    onAction={async () => {
                      const next = sub.status === "active" ? "paused" : "active";
                      await updateSubscription(sub.id, { status: next });
                      await showToast({
                        style: Toast.Style.Success,
                        title: next === "active" ? `Resumed ${sub.name}` : `Paused ${sub.name}`,
                      });
                      await popToRoot();
                    }}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => confirmAndDeleteSubscription(sub.name, () => deleteSubscription(sub.id))}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Sort By">
                  <Action title="Sort by Billing Day" onAction={() => setSortKey("billingDay")} />
                  <Action title="Sort by Name" onAction={() => setSortKey("name")} />
                  <Action title="Sort by Amount" onAction={() => setSortKey("amount")} />
                  <Action title="Sort by Category" onAction={() => setSortKey("category")} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Add Subscription"
                    icon={Icon.Plus}
                    target={<AddSubscriptionForm />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <ExportSubmenu subscriptions={subscriptions} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );
  }

  return (
    <List
      navigationTitle="All Subscriptions"
      isLoading={isLoading}
      searchBarPlaceholder="Search subscriptions…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Category" onChange={setCategoryValue}>
          <List.Dropdown.Item value={ALL_CATEGORIES_VALUE} title="All Categories" />
          {categories.map((cat) => (
            <List.Dropdown.Item key={cat} value={`${CATEGORY_VALUE_PREFIX}${cat}`} title={cat} />
          ))}
        </List.Dropdown>
      }
    >
      {filtered.length === 0 ? (
        <List.EmptyView
          icon={Icon.CreditCard}
          title="No Subscriptions"
          description="Press Cmd+N to add your first subscription"
          actions={
            <ActionPanel>
              <Action.Push title="Add Subscription" icon={Icon.Plus} target={<AddSubscriptionForm />} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {renderSection(active, "Active")}
          {renderSection(paused, "Paused")}
        </>
      )}
    </List>
  );
}

export default function SubscriptionListCommand() {
  return <SubscriptionList />;
}
