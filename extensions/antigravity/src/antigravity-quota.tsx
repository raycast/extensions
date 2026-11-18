import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { fetchQuotaData, QuotaGroup, formatDelta, getProgressIcon } from "./lib/quota";

type SortType = "percentage_asc" | "percentage_desc" | "reset_asc" | "reset_desc";

export default function Command() {
  const [groups, setGroups] = useState<QuotaGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortType>("percentage_asc");

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchQuotaData();
      setGroups(data);
    } catch (e) {
      let msg = e instanceof Error ? e.message : String(e);
      if (msg === "Could not detect any Antigravity processes.") {
        msg =
          "Antigravity process not found. Please ensure the Antigravity IDE is running. If it is already open, try restarting it.";
      }
      setError(msg);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch quota",
        message: msg,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const sortedGroups = useMemo(() => {
    const sorted = [...groups];
    sorted.sort((a, b) => {
      if (sortBy === "percentage_asc") {
        return (a.remainingPercentage ?? Infinity) - (b.remainingPercentage ?? Infinity);
      }
      if (sortBy === "percentage_desc") {
        return (b.remainingPercentage ?? -Infinity) - (a.remainingPercentage ?? -Infinity);
      }
      if (sortBy === "reset_asc") {
        return (a.resetTime?.getTime() ?? Infinity) - (b.resetTime?.getTime() ?? Infinity);
      }
      if (sortBy === "reset_desc") {
        return (b.resetTime?.getTime() ?? -Infinity) - (a.resetTime?.getTime() ?? -Infinity);
      }
      return 0;
    });
    return sorted;
  }, [groups, sortBy]);

  if (error) {
    const isProcessError = error.includes("Antigravity process not found");
    return (
      <List>
        <List.EmptyView
          icon={isProcessError ? Icon.ExclamationMark : Icon.Warning}
          title={isProcessError ? "Antigravity Not Detected" : "Error Fetching Data"}
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={loadData} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter models..."
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" storeValue={true} onChange={(newValue) => setSortBy(newValue as SortType)}>
          <List.Dropdown.Section title="Remaining %">
            <List.Dropdown.Item title="Least Remaining (Critical First)" value="percentage_asc" />
            <List.Dropdown.Item title="Most Remaining First" value="percentage_desc" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Reset Time">
            <List.Dropdown.Item title="Resetting Soonest First" value="reset_asc" />
            <List.Dropdown.Item title="Resetting Latest First" value="reset_desc" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {groups.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Bird}
          title="No Quota Data Found"
          description="Could not find any quota models from the running Antigravity process."
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={loadData} />
            </ActionPanel>
          }
        />
      )}
      {sortedGroups.map((group) => (
        <List.Section
          key={group.key}
          title={`Group (${group.remainingPercentage ?? "N/A"}%)`}
          subtitle={`Reset: ${group.resetTime ? group.resetTime.toLocaleString() : "N/A"}`}
        >
          {group.models.map((model) => {
            return (
              <List.Item
                key={model.modelId}
                icon={getProgressIcon(model.remainingPercentage)}
                title={model.label}
                subtitle={model.remainingPercentage !== null ? `${model.remainingPercentage}%` : "N/A"}
                accessories={[
                  { text: model.resetTime ? `Reset in ${formatDelta(model.timeUntilReset)}` : "" },
                  { date: model.resetTime || undefined, tooltip: model.resetTime?.toLocaleString() },
                ]}
                actions={
                  <ActionPanel>
                    <Action title="Reload" onAction={loadData} />
                    <Action
                      title="Clear Cache & Retry"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                      onAction={loadData}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
