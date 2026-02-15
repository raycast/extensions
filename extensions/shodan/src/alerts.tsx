import { useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Form,
  useNavigation,
  showToast,
  Toast,
  Alert,
  confirmAlert,
  Color,
  getPreferenceValues,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ShodanAlert } from "./api/types";
import { formatTimestamp } from "./utils/formatters";
import { shodanClient } from "./api/client";
import { usePlanCapabilities } from "./hooks/usePlanCapabilities";
import { PremiumFeatureNotice } from "./components/PremiumFeatureNotice";

function CreateAlertForm({ onSuccess }: { onSuccess: () => void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: { name: string; ips: string }) => {
    const name = values.name.trim();
    const ips = values.ips
      .split(/[,\n]/)
      .map((ip) => ip.trim())
      .filter((ip) => ip.length > 0);

    if (!name) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    if (ips.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "At least one IP is required",
      });
      return;
    }

    setIsLoading(true);
    try {
      await shodanClient.createAlert(name, ips);
      await showToast({
        style: Toast.Style.Success,
        title: "Alert Created",
        message: name,
      });
      onSuccess();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Create Alert",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Network Alert"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Alert"
            onSubmit={handleSubmit}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Alert Name"
        placeholder="My Network Monitor"
        autoFocus
      />
      <Form.TextArea
        id="ips"
        title="IP Addresses"
        placeholder="Enter IP addresses or CIDR ranges, one per line or comma-separated"
      />
      <Form.Description text="Monitor IP addresses or CIDR ranges for changes. You'll be notified when Shodan detects new services or changes." />
    </Form>
  );
}

export default function AlertsCommand() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const { push } = useNavigation();
  const [accessError, setAccessError] = useState<string | null>(null);
  const { plan } = usePlanCapabilities();

  const {
    data: alerts,
    isLoading,
    revalidate,
  } = useFetch<ShodanAlert[]>(
    `https://api.shodan.io/shodan/alert/info?key=${apiKey}`,
    {
      onError: (err) => {
        let message = err.message;
        if (message.includes("401") || message.includes("403")) {
          setAccessError(
            "Your plan may not have access to Network Alerts. Upgrade to a Membership for full access.",
          );
          message = "Access denied - Membership may be required";
        }
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load Alerts",
          message,
        });
      },
    },
  );

  const handleDelete = async (alert: ShodanAlert) => {
    const confirmed = await confirmAlert({
      title: "Delete Alert",
      message: `Are you sure you want to delete "${alert.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await shodanClient.deleteAlert(alert.id);
        await showToast({ style: Toast.Style.Success, title: "Alert Deleted" });
        revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete Alert",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  const handleCreate = () => {
    push(<CreateAlertForm onSuccess={revalidate} />);
  };

  if (accessError && !isLoading) {
    return (
      <List navigationTitle="Network Alerts">
        <PremiumFeatureNotice
          feature="Network Alerts"
          requiredPlan="Shodan Membership"
          currentPlan={plan}
          description={`Network monitoring requires a Shodan Membership.\n\nYour current plan: ${plan.toUpperCase()}\n\nUpgrade to monitor IP addresses and receive alerts about changes.`}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search alerts..."
      actions={
        <ActionPanel>
          <Action
            title="Create Alert"
            icon={Icon.Plus}
            onAction={handleCreate}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => revalidate()}
          />
        </ActionPanel>
      }
    >
      {alerts && alerts.length === 0 && (
        <List.EmptyView
          title="No Network Alerts"
          description="Create an alert to monitor IP addresses for changes."
          icon={Icon.Bell}
          actions={
            <ActionPanel>
              <Action
                title="Create Alert"
                icon={Icon.Plus}
                onAction={handleCreate}
              />
            </ActionPanel>
          }
        />
      )}

      {alerts && alerts.length > 0 && (
        <List.Section
          title="Network Alerts"
          subtitle={`${alerts.length} alert${alerts.length !== 1 ? "s" : ""}`}
        >
          {alerts.map((alert) => {
            const ipCount = alert.filters.ip.length;
            const isExpired = alert.expires
              ? Date.now() / 1000 > alert.expires
              : false;

            return (
              <List.Item
                key={alert.id}
                title={alert.name}
                subtitle={`${ipCount} IP${ipCount !== 1 ? "s" : ""} monitored`}
                icon={{
                  source: Icon.Bell,
                  tintColor: isExpired ? Color.Red : Color.Green,
                }}
                accessories={[
                  { text: `Created: ${formatTimestamp(alert.created)}` },
                  isExpired
                    ? { tag: { value: "Expired", color: Color.Red } }
                    : { tag: { value: "Active", color: Color.Green } },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="View">
                      <Action.OpenInBrowser
                        title="View on Shodan"
                        url={`https://monitor.shodan.io/dashboard`}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Copy">
                      <Action.CopyToClipboard
                        title="Copy IP Addresses"
                        content={alert.filters.ip.join(", ")}
                      />
                      <Action.CopyToClipboard
                        title="Copy Alert ID"
                        content={alert.id}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Manage">
                      <Action
                        title="Delete Alert"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleDelete(alert)}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      />
                      <Action
                        title="Create New Alert"
                        icon={Icon.Plus}
                        onAction={handleCreate}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        onAction={() => revalidate()}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    </ActionPanel.Section>
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
