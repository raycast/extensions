// src/subscriptions-list.tsx
import { List, Icon, Color, ActionPanel, Action, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { authorize } from "./oauth";
import { useState, useEffect, useMemo } from "react";

// --- Type Interfaces for Mollie API Responses ---
interface Amount {
  value: string;
  currency: string;
}

type SubscriptionStatus = "active" | "pending" | "canceled" | "suspended" | "completed";

interface Subscription {
  id: string;
  customerId: string;
  mode: "live" | "test";
  status: SubscriptionStatus;
  amount: Amount;
  times: number | null;
  timesRemaining: number | null;
  interval: string;
  startDate: string;
  nextPaymentDate: string | null;
  description: string;
  method: string | null;
  mandateId: string | null;
  canceledAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  _links: {
    self: { href: string };
    customer: { href: string };
    payments?: { href: string };
    documentation: { href: string };
  };
}

interface PaginatedSubscriptions {
  count: number;
  _embedded: {
    subscriptions: Subscription[];
  };
}

interface Customer {
  id: string;
  name: string | null;
  email: string | null;
}

interface PaginatedCustomers {
  _embedded: {
    customers: Customer[];
  };
}

// Helper to format currency
const formatCurrency = (value: string, currency: string) => {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(parseFloat(value));
};

// Helper to format date
const formatDate = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Helper to format date short (for accessories)
const formatDateShort = (dateString: string | null): string => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
  });
};

// Helper to get status icon
const getStatusIcon = (status: SubscriptionStatus): { source: Icon; tintColor: Color } => {
  switch (status) {
    case "active":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "pending":
      return { source: Icon.Clock, tintColor: Color.Orange };
    case "suspended":
      return { source: Icon.Pause, tintColor: Color.Red };
    case "completed":
      return { source: Icon.CheckCircle, tintColor: Color.Blue };
    case "canceled":
      return { source: Icon.XMarkCircle, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
};

// Helper to get status tag
const getStatusTag = (status: SubscriptionStatus): List.Item.Accessory => {
  switch (status) {
    case "active":
      return { tag: { value: "Active", color: Color.Green } };
    case "pending":
      return { tag: { value: "Pending", color: Color.Orange } };
    case "suspended":
      return { tag: { value: "Suspended", color: Color.Red } };
    case "completed":
      return { tag: { value: "Completed", color: Color.Blue } };
    case "canceled":
      return { tag: { value: "Canceled", color: Color.SecondaryText } };
    default:
      return { tag: { value: status, color: Color.SecondaryText } };
  }
};

// The actual Subscriptions List component
function SubscriptionsList({ accessToken }: { accessToken: string }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerMap, setCustomerMap] = useState<Map<string, Customer>>(new Map());

  // Fetch subscriptions
  const { data, isLoading, revalidate } = useFetch<PaginatedSubscriptions>(
    `https://api.mollie.com/v2/subscriptions?limit=250`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      keepPreviousData: true,
    },
  );

  const allSubscriptions = data?._embedded?.subscriptions || [];

  // Fetch customers for name resolution
  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await fetch(`https://api.mollie.com/v2/customers?limit=250`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const customersData: PaginatedCustomers = await response.json();
          const map = new Map<string, Customer>();
          customersData._embedded?.customers?.forEach((customer) => {
            map.set(customer.id, customer);
          });
          setCustomerMap(map);
        }
      } catch (error) {
        console.error("Failed to fetch customers:", error);
      }
    }

    if (allSubscriptions.length > 0) {
      fetchCustomers();
    }
  }, [accessToken, allSubscriptions.length]);

  // Function to handle cancel subscription
  async function handleCancelSubscription(subscription: Subscription) {
    const confirmed = await confirmAlert({
      title: "Cancel Subscription",
      message: `Are you sure you want to cancel "${subscription.description || "this subscription"}"?\n\nThis action cannot be undone.`,
      primaryAction: {
        title: "Cancel Subscription",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Canceling subscription...",
    });

    try {
      const response = await fetch(
        `https://api.mollie.com/v2/customers/${subscription.customerId}/subscriptions/${subscription.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.title || `HTTP error! Status: ${response.status}`);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Subscription Canceled";
      toast.message = subscription.description || subscription.id;

      // Refresh the subscription list
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Cancel";
      toast.message = error instanceof Error ? error.message : "An unknown error occurred.";
    }
  }

  // Filter subscriptions based on selected status
  const filteredSubscriptions = useMemo(() => {
    if (statusFilter === "all") {
      return allSubscriptions;
    }
    return allSubscriptions.filter((subscription) => subscription.status === statusFilter);
  }, [allSubscriptions, statusFilter]);

  // Get customer display name
  const getCustomerDisplay = (customerId: string): string => {
    const customer = customerMap.get(customerId);
    if (customer?.name) return customer.name;
    if (customer?.email) return customer.email;
    return customerId;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search subscriptions..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Status" value={statusFilter} onChange={setStatusFilter}>
          <List.Dropdown.Item title="All Subscriptions" value="all" />
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="Active" value="active" icon={{ source: Icon.Dot, tintColor: Color.Green }} />
            <List.Dropdown.Item title="Pending" value="pending" icon={{ source: Icon.Dot, tintColor: Color.Orange }} />
            <List.Dropdown.Item title="Suspended" value="suspended" icon={{ source: Icon.Dot, tintColor: Color.Red }} />
            <List.Dropdown.Item
              title="Completed"
              value="completed"
              icon={{ source: Icon.Dot, tintColor: Color.Blue }}
            />
            <List.Dropdown.Item
              title="Canceled"
              value="canceled"
              icon={{ source: Icon.Dot, tintColor: Color.SecondaryText }}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredSubscriptions.map((subscription) => {
        const statusTag = getStatusTag(subscription.status);
        const statusIcon = getStatusIcon(subscription.status);
        const customerDisplay = getCustomerDisplay(subscription.customerId);

        const accessories: List.Item.Accessory[] = [
          statusTag,
          { text: subscription.interval },
          { text: formatCurrency(subscription.amount.value, subscription.amount.currency) },
        ];

        if (subscription.nextPaymentDate) {
          accessories.push({
            text: `Next: ${formatDateShort(subscription.nextPaymentDate)}`,
            tooltip: `Next payment: ${formatDate(subscription.nextPaymentDate)}`,
          });
        }

        return (
          <List.Item
            key={subscription.id}
            icon={statusIcon}
            title={subscription.description || "No description"}
            subtitle={customerDisplay}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={`https://my.mollie.com/dashboard/customers/${subscription.customerId}/subscriptions/${subscription.id}`}
                  title="Open in Mollie Dashboard"
                />
                {(subscription.status === "active" || subscription.status === "pending") && (
                  <Action
                    title="Cancel Subscription"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    onAction={() => handleCancelSubscription(subscription)}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Subscription ID"
                  content={subscription.id}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Customer ID"
                  content={subscription.customerId}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={() => revalidate()}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && filteredSubscriptions.length === 0 && (
        <List.EmptyView
          title="No Subscriptions Found"
          description={
            statusFilter === "all"
              ? "You don't have any subscriptions yet."
              : `No ${statusFilter} subscriptions found. Try changing the filter.`
          }
          icon={Icon.Calendar}
        />
      )}
    </List>
  );
}

// Main component to handle the authorization flow
export default function Command() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function doAuthorize() {
      try {
        const token = await authorize();
        setAccessToken(token);
      } catch (err) {
        console.error("Authorization failed:", err);
        setError(err as Error);
        showToast(Toast.Style.Failure, "Authorization Failed", (err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    doAuthorize();
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView title="Authorization Failed" description={error.message} icon={Icon.Warning} />
      </List>
    );
  }

  return isLoading ? <List isLoading={true} /> : <SubscriptionsList accessToken={accessToken!} />;
}
