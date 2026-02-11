import { List, ActionPanel, Action, Icon, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useAssignedTickets } from "./hooks/useJira";
import LogWorkForm from "./components/LogWorkForm";
import UpdateStatusForm from "./components/UpdateStatusForm";
import WorkDaysForm from "./components/WorkDaysForm";
import { useState } from "react";

export default function Command() {
  const { tickets, isLoading, revalidate } = useAssignedTickets();
  const [selectedIssueKeys, setSelectedIssueKeys] = useState<string[]>([]);

  const toggleSelection = (key: string) => {
    setSelectedIssueKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search assigned tickets..."
      onSelectionChange={() => {
        // Raycast doesn't natively support multi-select in List easily without custom state
      }}
    >
      <List.EmptyView title="No assigned tickets found" description="Great job! Or maybe check your JQL." />

      {tickets?.map((issue) => (
        <List.Item
          key={issue.id}
          id={issue.key}
          title={issue.key}
          subtitle={
            issue.fields.parent
              ? `${issue.fields.summary} (Parent: ${issue.fields.parent.fields.summary})`
              : issue.fields.summary
          }
          icon={issue.fields.issuetype.iconUrl}
          accessories={[
            {
              tag: {
                value: issue.fields.status.name,
                color: getStatusColor(issue.fields.status.name),
              },
            },
            {
              icon: issue.fields.priority.iconUrl,
              tooltip: issue.fields.priority.name,
            },
            ...(selectedIssueKeys.includes(issue.key) ? [{ icon: Icon.Checkmark, tooltip: "Selected" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Log Work"
                icon={Icon.Clock}
                target={<LogWorkForm issueKeys={[issue.key]} onDone={revalidate} />}
              />
              <Action.Push
                title="Update Status"
                icon={Icon.CheckCircle}
                target={<UpdateStatusForm issue={issue} onDone={revalidate} />}
              />
              <Action
                title={selectedIssueKeys.includes(issue.key) ? "Deselect" : "Select for Batch"}
                icon={selectedIssueKeys.includes(issue.key) ? Icon.Circle : Icon.Checkmark}
                onAction={() => toggleSelection(issue.key)}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
              {selectedIssueKeys.length > 0 && (
                <Action.Push
                  title={`Log Work for ${selectedIssueKeys.length} Selected`}
                  icon={Icon.List}
                  target={
                    <LogWorkForm
                      issueKeys={selectedIssueKeys}
                      onDone={() => {
                        setSelectedIssueKeys([]);
                        revalidate();
                      }}
                    />
                  }
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.Push
                title="Configure Work Days"
                icon={Icon.Calendar}
                target={<WorkDaysFormWrapper onDone={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function WorkDaysFormWrapper({ onDone }: { onDone: () => void }) {
  const { data: storedWorkDays, isLoading } = useCachedPromise(async () => {
    const item = await LocalStorage.getItem<string>("workDays");
    if (item) return JSON.parse(item) as string[];
    return ["1", "2", "3", "4", "5"];
  });

  if (isLoading) return null;
  return <WorkDaysForm initialDays={storedWorkDays || ["1", "2", "3", "4", "5"]} onDone={onDone} />;
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "in progress":
      return "#0052CC";
    case "to do":
      return "#42526E";
    case "done":
      return "#00875A";
    case "in review":
      return "#FFAB00";
    default:
      return undefined;
  }
}
