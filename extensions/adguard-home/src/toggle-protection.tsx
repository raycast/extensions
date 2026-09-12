import React from "react";
import { List, Icon, ActionPanel, Action, Color, Toast, showToast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getStatus, toggleProtection, Status, getAdGuardHomeUrl, disableProtection } from "./api";

export default function Command() {
  const [status, setStatus] = useState<Status | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [snoozeEndTime, setSnoozeEndTime] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<string>("");

  useEffect(() => {
    async function init() {
      const data = await getStatus();
      setStatus(data);
      if (!data.protection_enabled && data.protection_disabled_duration) {
        const endTime = new Date(Date.now() + data.protection_disabled_duration);
        setSnoozeEndTime(endTime);
      }
      setIsLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!snoozeEndTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = snoozeEndTime.getTime() - now.getTime();

      if (diff <= 0) {
        setSnoozeEndTime(null);
        setRemainingTime("");
        fetchStatus();
        return;
      }

      if (diff % (5 * 1000) === 0) {
        fetchStatus();
      }

      const seconds = Math.floor(diff / 1000);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;

      setRemainingTime(
        hours > 0
          ? `${hours}h ${minutes}m ${remainingSeconds}s`
          : minutes > 0
          ? `${minutes}m ${remainingSeconds}s`
          : `${remainingSeconds}s`
      );
    }, 500);

    return () => clearInterval(interval);
  }, [snoozeEndTime]);

  async function fetchStatus() {
    try {
      const data = await getStatus();
      if (!data.protection_enabled && data.protection_disabled_duration) {
        const endTime = new Date(Date.now() + data.protection_disabled_duration);
        setSnoozeEndTime(endTime);
      } else if (data.protection_enabled) {
        setSnoozeEndTime(null);
        setRemainingTime("");
      }
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

  async function handleDisable(duration: number) {
    try {
      await disableProtection(duration);
      const endTime = new Date(Date.now() + duration);
      setSnoozeEndTime(endTime);
      setStatus((prev) => (prev ? { ...prev, protection_enabled: false } : null));
      showToast({
        style: Toast.Style.Success,
        title: "Protection disabled",
        message: `Will be re-enabled in ${duration / (60 * 1000)} minutes`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to disable protection",
        message: String(error),
      });
    }
  }

  async function handleDisableUntilTomorrow() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const duration = tomorrow.getTime() - now.getTime();
    await handleDisable(duration);
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
          source: status?.protection_enabled ? Icon.CheckCircle : remainingTime ? Icon.Clock : Icon.XMarkCircle,
          tintColor: status?.protection_enabled ? Color.Green : remainingTime ? Color.Orange : Color.Red,
        }}
        accessories={[
          {
            text: status?.protection_enabled
              ? "Protection Active"
              : remainingTime
              ? `Disabled (${remainingTime} remaining)`
              : "Protection Disabled",
            icon: {
              source: status?.protection_enabled ? Icon.CheckCircle : remainingTime ? Icon.Clock : Icon.XMarkCircle,
              tintColor: status?.protection_enabled ? Color.Green : remainingTime ? Color.Orange : Color.Red,
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
              {status?.protection_enabled && (
                <ActionPanel.Submenu title="Disable Protection" icon={Icon.Clock}>
                  <Action title="Disable for 1 Minute" onAction={() => handleDisable(60 * 1000)} icon={Icon.Clock} />
                  <Action
                    title="Disable for 10 Minutes"
                    onAction={() => handleDisable(10 * 60 * 1000)}
                    icon={Icon.Clock}
                  />
                  <Action title="Disable for 1 Hour" onAction={() => handleDisable(60 * 60 * 1000)} icon={Icon.Clock} />
                  <Action
                    title="Disable for 8 Hours"
                    onAction={() => handleDisable(8 * 60 * 60 * 1000)}
                    icon={Icon.Clock}
                  />
                  <Action
                    title="Disable Until Tomorrow"
                    onAction={() => handleDisableUntilTomorrow()}
                    icon={Icon.Clock}
                  />
                </ActionPanel.Submenu>
              )}
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
