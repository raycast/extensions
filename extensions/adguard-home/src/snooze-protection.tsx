import React from "react";
import { List, Icon, ActionPanel, Action, Color, Toast, showToast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getStatus, disableProtection, Status } from "./api";

export default function Command() {
  const [status, setStatus] = useState<Status | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [snoozeEndTime, setSnoozeEndTime] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<string>("");

  // Initial load of status and disabled state
  useEffect(() => {
    async function init() {
      const data = await getStatus();
      setStatus(data);
      if (!data.protection_enabled && data.protection_disabled_duration) {
        setSnoozeEndTime(new Date(Date.now() + data.protection_disabled_duration));
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

      const seconds = Math.floor(diff / 1000);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;

      const newRemainingTime =
        hours > 0
          ? `${hours}h ${minutes}m ${remainingSeconds}s`
          : minutes > 0
          ? `${minutes}m ${remainingSeconds}s`
          : `${remainingSeconds}s`;
      setRemainingTime(newRemainingTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [snoozeEndTime]);

  useEffect(() => {
    if (!snoozeEndTime) return;

    const statusInterval = setInterval(fetchStatus, 5000);
    return () => clearInterval(statusInterval);
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

  async function handleDisable(duration: number) {
    try {
      await disableProtection(duration);
      const endTime = new Date(Date.now() + duration);
      setSnoozeEndTime(endTime);
      await fetchStatus();
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

  return (
    <List isLoading={isLoading}>
      <List.Item
        title="Protection Status"
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
      />
      <List.Section title="Disable Protection">
        <List.Item
          title="Disable for 1 Minute"
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action title="Disable for 1 Minute" onAction={() => handleDisable(60 * 1000)} icon={Icon.Clock} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Disable for 10 Minutes"
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action title="Disable for 10 Minutes" onAction={() => handleDisable(10 * 60 * 1000)} icon={Icon.Clock} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Disable for 1 Hour"
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action title="Disable for 1 Hour" onAction={() => handleDisable(60 * 60 * 1000)} icon={Icon.Clock} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Disable for 8 Hours"
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action
                title="Disable for 8 Hours"
                onAction={() => handleDisable(8 * 60 * 60 * 1000)}
                icon={Icon.Clock}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Disable Until Tomorrow"
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action title="Disable Until Tomorrow" onAction={handleDisableUntilTomorrow} icon={Icon.Clock} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
