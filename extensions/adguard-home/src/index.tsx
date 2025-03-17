import React from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getStatus, toggleProtection, Status, getQueryLog, QueryLogEntry, getCustomRules, CustomRule } from "./api";
import { QueryLog } from "./components/QueryLog";
import { CustomRules } from "./components/CustomRules";

export default function Command() {
  const [status, setStatus] = useState<Status | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [queryLog, setQueryLog] = useState<QueryLogEntry[]>([]);
  const [customRules, setCustomRules] = useState<CustomRule[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>("status");

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
      await toggleProtection(!status.protection_enabled);
      await fetchStatus();
      showToast({
        style: Toast.Style.Success,
        title: `Protection ${status.protection_enabled ? "disabled" : "enabled"}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle protection",
        message: String(error),
      });
    }
  }

  async function fetchQueryLog() {
    try {
      const data = await getQueryLog();
      setQueryLog(data);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch query log",
        message: String(error),
      });
    }
  }

  async function fetchCustomRules() {
    try {
      const data = await getCustomRules();
      setCustomRules(data);
    } catch (error) {
      setCustomRules([]);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch custom rules",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    fetchQueryLog();
    fetchCustomRules();
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="AdGuard Home Control"
      searchBarAccessory={
        <List.Dropdown tooltip="Select View" onChange={setSelectedTab} value={selectedTab}>
          <List.Dropdown.Item title="Status" value="status" />
          <List.Dropdown.Item title="Query Log" value="queryLog" />
          <List.Dropdown.Item title="Custom Rules" value="customRules" />
        </List.Dropdown>
      }
    >
      {selectedTab === "status" && (
        <>
          <List.Item
            title="Protection Status"
            icon={status?.protection_enabled ? Icon.CheckCircle : Icon.XMarkCircle}
            accessories={[{ text: status?.protection_enabled ? "Enabled" : "Disabled" }]}
            actions={
              <ActionPanel>
                <Action
                  title={status?.protection_enabled ? "Disable Protection" : "Enable Protection"}
                  onAction={handleToggleProtection}
                  icon={status?.protection_enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                />
                <Action title="Refresh" onAction={fetchStatus} icon={Icon.ArrowClockwise} />
              </ActionPanel>
            }
          />
          <List.Item
            title="DNS Queries Today"
            icon={Icon.Document}
            accessories={[{ text: status?.dns_queries?.toString() ?? "0" }]}
          />
          <List.Item
            title="Blocked Queries Today"
            icon={Icon.ExclamationMark}
            accessories={[{ text: status?.blocked_today?.toString() ?? "0" }]}
          />
        </>
      )}
      {selectedTab === "queryLog" && <QueryLog entries={queryLog} isLoading={isLoading} />}
      {selectedTab === "customRules" && (
        <CustomRules rules={customRules} isLoading={isLoading} onRuleChange={fetchCustomRules} />
      )}
    </List>
  );
}
