import React from "react";
import { List, Icon, ActionPanel, Action, Color, Toast, showToast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getStatus, toggleProtection, Status, getAdGuardHomeUrl } from "./api";

export default function Command() {
  const [status, setStatus] = useState<Status | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchStatus() {
    try {
      const data = await getStatus();
      setStatus(data);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch status",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleProtection() {
    if (!status) return;
    try {
      const newState = !status.protection_enabled;
      await toggleProtection(newState);
      setStatus((prev) => (prev ? { ...prev, protection_enabled: newState } : null));
      showToast({
        style: Toast.Style.Success,
        title: `Protection ${newState ? "enabled" : "disabled"}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle protection",
        message: String(error),
      });
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <List isLoading={isLoading}>
      <List.Item
        title="Protection Status"
        subtitle={status?.protection_enabled ? "Protection is Active" : "Protection is Disabled"}
        icon={{
          source: status?.protection_enabled ? Icon.CheckCircle : Icon.XMarkCircle,
          tintColor: status?.protection_enabled ? Color.Green : Color.Red,
        }}
        accessories={[
          {
            text: status?.protection_enabled ? "Enabled" : "Disabled",
            icon: {
              source: status?.protection_enabled ? Icon.CheckCircle : Icon.XMarkCircle,
              tintColor: status?.protection_enabled ? Color.Green : Color.Red,
            },
          },
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title={status?.protection_enabled ? "Disable Protection" : "Enable Protection"}
                onAction={handleToggleProtection}
                icon={{
                  source: status?.protection_enabled ? Icon.XMarkCircle : Icon.CheckCircle,
                  tintColor: status?.protection_enabled ? Color.Red : Color.Green,
                }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.OpenInBrowser title="Open in Adguard Home" url={`${getAdGuardHomeUrl()}/#`} />
              <Action
                title="Refresh Status"
                icon={Icon.ArrowClockwise}
                onAction={fetchStatus}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    </List>
  );
}
