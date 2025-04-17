import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
  getPreferenceValues,
} from "@raycast/api";
import { ActiveSprint, JiraIssue, SprintIssuesResponse, EpicCache, CustomFieldConfig } from "../types";
import { jiraFetchObject, jiraUrl } from "../jira";
import { useEffect, useState } from "react";

type SortField = "status" | "remaining" | "priority" | "assignee" | "epic";

interface FieldVisibility {
  priority: boolean;
  remainingTime: boolean;
  status: boolean;
  assignee: boolean;
  epic: boolean;
}

const DEFAULT_VISIBILITY: FieldVisibility = {
  priority: true,
  remainingTime: true,
  status: true,
  assignee: true,
  epic: true,
};

interface SprintDetailProps {
  sprint: ActiveSprint;
}

interface VisibilityConfigurationProps {
  fieldVisibility: FieldVisibility;
  updateFieldVisibility: (newVisibility: FieldVisibility) => Promise<void>;
  sprint: ActiveSprint;
}

function VisibilityConfiguration({
  fieldVisibility: initialVisibility,
  updateFieldVisibility,
}: VisibilityConfigurationProps) {
  const [localVisibility, setLocalVisibility] = useState(initialVisibility);
  const { pop } = useNavigation();

  useEffect(() => {
    setLocalVisibility(initialVisibility);
  }, [initialVisibility]);

  const handleVisibilityChange = async (newVisibility: FieldVisibility) => {
    setLocalVisibility(newVisibility);
  };

  const handleSave = async () => {
    try {
      await LocalStorage.setItem("field-visibility", JSON.stringify(localVisibility));
      await updateFieldVisibility(localVisibility);
      await showToast({
        style: Toast.Style.Success,
        title: "Field visibility saved",
      });
      await pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save field visibility",
        message: String(error),
      });
    }
  };

  return (
    <List navigationTitle="Configure Visible Fields">
      <List.Section title="Visible Fields">
        <List.Item
          title="Priority"
          icon={localVisibility.priority ? Icon.Checkmark : Icon.Circle}
          accessories={[{ text: localVisibility.priority ? "Visible" : "Hidden" }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.SubmitForm title="Save and Close" icon={Icon.CheckCircle} onSubmit={handleSave} />
                <Action
                  title={localVisibility.priority ? "Hide Field" : "Show Field"}
                  icon={localVisibility.priority ? Icon.EyeSlash : Icon.Eye}
                  shortcut={{ modifiers: [], key: "space" }}
                  onAction={() =>
                    handleVisibilityChange({
                      ...localVisibility,
                      priority: !localVisibility.priority,
                    })
                  }
                />
                <Action
                  title="Reset to Defaults"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => handleVisibilityChange(DEFAULT_VISIBILITY)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
        <List.Item
          title="Remaining Time"
          icon={localVisibility.remainingTime ? Icon.Checkmark : Icon.Circle}
          accessories={[{ text: localVisibility.remainingTime ? "Visible" : "Hidden" }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.SubmitForm
                  title="Save and Close"
                  icon={Icon.CheckCircle}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  onSubmit={handleSave}
                />
                <Action
                  title={localVisibility.remainingTime ? "Hide Field" : "Show Field"}
                  icon={localVisibility.remainingTime ? Icon.EyeSlash : Icon.Eye}
                  shortcut={{ modifiers: [], key: "space" }}
                  onAction={() =>
                    handleVisibilityChange({
                      ...localVisibility,
                      remainingTime: !localVisibility.remainingTime,
                    })
                  }
                />
                <Action
                  title="Reset to Defaults"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => handleVisibilityChange(DEFAULT_VISIBILITY)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
        <List.Item
          title="Status"
          icon={localVisibility.status ? Icon.Checkmark : Icon.Circle}
          accessories={[{ text: localVisibility.status ? "Visible" : "Hidden" }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.SubmitForm
                  title="Save and Close"
                  icon={Icon.CheckCircle}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  onSubmit={handleSave}
                />
                <Action
                  title={localVisibility.status ? "Hide Field" : "Show Field"}
                  icon={localVisibility.status ? Icon.EyeSlash : Icon.Eye}
                  shortcut={{ modifiers: [], key: "space" }}
                  onAction={() =>
                    handleVisibilityChange({
                      ...localVisibility,
                      status: !localVisibility.status,
                    })
                  }
                />
                <Action
                  title="Reset to Defaults"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => handleVisibilityChange(DEFAULT_VISIBILITY)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
        <List.Item
          title="Assignee"
          icon={localVisibility.assignee ? Icon.Checkmark : Icon.Circle}
          accessories={[{ text: localVisibility.assignee ? "Visible" : "Hidden" }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.SubmitForm
                  title="Save and Close"
                  icon={Icon.CheckCircle}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  onSubmit={handleSave}
                />
                <Action
                  title={localVisibility.assignee ? "Hide Field" : "Show Field"}
                  icon={localVisibility.assignee ? Icon.EyeSlash : Icon.Eye}
                  shortcut={{ modifiers: [], key: "space" }}
                  onAction={() =>
                    handleVisibilityChange({
                      ...localVisibility,
                      assignee: !localVisibility.assignee,
                    })
                  }
                />
                <Action
                  title="Reset to Defaults"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => handleVisibilityChange(DEFAULT_VISIBILITY)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
        <List.Item
          title="Epic"
          icon={localVisibility.epic ? Icon.Checkmark : Icon.Circle}
          accessories={[{ text: localVisibility.epic ? "Visible" : "Hidden" }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.SubmitForm
                  title="Save and Close"
                  icon={Icon.CheckCircle}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  onSubmit={handleSave}
                />
                <Action
                  title={localVisibility.epic ? "Hide Field" : "Show Field"}
                  icon={localVisibility.epic ? Icon.EyeSlash : Icon.Eye}
                  shortcut={{ modifiers: [], key: "space" }}
                  onAction={() =>
                    handleVisibilityChange({
                      ...localVisibility,
                      epic: !localVisibility.epic,
                    })
                  }
                />
                <Action
                  title="Reset to Defaults"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => handleVisibilityChange(DEFAULT_VISIBILITY)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

export function SprintDetail({ sprint }: SprintDetailProps) {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("status");
  const [fieldVisibility, setFieldVisibility] = useState<FieldVisibility>(DEFAULT_VISIBILITY);
  const [epicCache, setEpicCache] = useState<EpicCache>({});
  const preferences = getPreferenceValues();
  const fieldConfig: CustomFieldConfig = {
    epicLinkField: preferences.epicLinkField as string,
    epicNameField: preferences.epicNameField as string,
    sprintField: preferences.sprintField as string,
    storyPointsField: preferences.storyPointsField as string,
  };

  useEffect(() => {
    async function loadConfig() {
      const storedVisibility = await LocalStorage.getItem<string>("field-visibility");
      if (storedVisibility) {
        setFieldVisibility(JSON.parse(storedVisibility));
      }
    }
    loadConfig();
  }, []);

  useEffect(() => {
    async function fetchEpicNames() {
      const newEpicCache: EpicCache = {};
      const epicKeys = new Set<string>();

      issues.forEach((issue) => {
        const epicKey = issue.fields[fieldConfig.epicLinkField];
        if (typeof epicKey === "string" && !epicCache[epicKey]) {
          epicKeys.add(epicKey);
        }
      });

      for (const epicKey of epicKeys) {
        try {
          const epicIssue = await jiraFetchObject<JiraIssue>(`/rest/api/2/issue/${epicKey}`);
          const epicName = epicIssue.fields[fieldConfig.epicNameField];
          newEpicCache[epicKey] = typeof epicName === "string" ? epicName : epicIssue.fields.summary;
        } catch (error) {
          console.error(`Error fetching epic ${epicKey}:`, error);
          newEpicCache[epicKey] = epicKey;
        }
      }

      setEpicCache((prev) => ({ ...prev, ...newEpicCache }));
    }

    if (issues.length > 0) {
      fetchEpicNames();
    }
  }, [issues, fieldConfig.epicLinkField, fieldConfig.epicNameField]);

  useEffect(() => {
    async function loadSprintIssues() {
      try {
        const response = await jiraFetchObject<SprintIssuesResponse>(`/rest/agile/1.0/sprint/${sprint.id}/issue`);
        setIssues(response.issues || []);
      } catch (error) {
        console.error("Error loading sprint issues:", error);
      }
      setIsLoading(false);
    }

    loadSprintIssues();
  }, [sprint.id]);

  const getStatusColor = (status: string): Color => {
    switch (status.toLowerCase()) {
      case "done":
        return Color.Green;
      case "in progress":
        return Color.Blue;
      case "blocked":
        return Color.Red;
      default:
        return Color.SecondaryText;
    }
  };

  const calculateProgress = () => {
    const start = new Date(sprint.startDate).getTime();
    const end = new Date(sprint.endDate).getTime();
    const now = Date.now();

    if (now < start) return "Not started";
    if (now > end) return "Ended";

    const total = end - start;
    const current = now - start;
    const percentage = Math.round((current / total) * 100);
    return `${percentage}%`;
  };

  const formatTimeEstimate = (seconds: number | undefined): string => {
    if (!seconds) return "0h";
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
  };

  const calculateTotalTime = () => {
    const totals = issues.reduce(
      (acc, issue) => {
        return {
          original: acc.original + (issue.fields.timetracking.originalEstimateSeconds || 0),
          remaining: acc.remaining + (issue.fields.timetracking.remainingEstimateSeconds || 0),
        };
      },
      { original: 0, remaining: 0 },
    );

    return {
      original: formatTimeEstimate(totals.original),
      remaining: formatTimeEstimate(totals.remaining),
    };
  };

  const sortIssues = (issues: JiraIssue[]): JiraIssue[] => {
    return [...issues].sort((a, b) => {
      switch (sortField) {
        case "status":
          return (a.fields.status.name || "").localeCompare(b.fields.status.name || "");
        case "remaining": {
          const aRemaining = a.fields.timetracking.remainingEstimateSeconds || 0;
          const bRemaining = b.fields.timetracking.remainingEstimateSeconds || 0;
          return bRemaining - aRemaining;
        }
        case "priority":
          return (a.fields.priority.name || "").localeCompare(b.fields.priority.name || "");
        case "assignee": {
          const aName = a.fields.assignee?.displayName || "Unassigned";
          const bName = b.fields.assignee?.displayName || "Unassigned";
          return aName.localeCompare(bName);
        }
        case "epic": {
          const aEpic = a.fields[fieldConfig.epicLinkField];
          const bEpic = b.fields[fieldConfig.epicLinkField];
          const aEpicName = typeof aEpic === "string" ? epicCache[aEpic] || "No Epic" : "No Epic";
          const bEpicName = typeof bEpic === "string" ? epicCache[bEpic] || "No Epic" : "No Epic";
          return aEpicName.localeCompare(bEpicName);
        }
        default:
          return 0;
      }
    });
  };

  const formatTitle = (summary: string, key: string, epicField: unknown, maxLength: number = 40): string => {
    const truncated = summary.length <= maxLength ? summary : summary.substring(0, maxLength - 1) + "…";
    const paddedKey = key.padEnd(12, " ");
    const epicText = typeof epicField === "string" ? ` [${epicField}]` : "";
    return `${paddedKey}  ${truncated}${epicText}`;
  };

  const getIssueAccessories = (issue: JiraIssue) => {
    const accessories: List.Item.Accessory[] = [];

    // Epic icon with name in tooltip if present
    const epicKey = issue.fields[fieldConfig.epicLinkField];
    if (fieldVisibility.epic && typeof epicKey === "string") {
      const epicName = epicCache[epicKey] || "Loading epic...";
      accessories.push({
        icon: { source: Icon.Tag, tintColor: Color.Purple },
        tooltip: "Epic link: " + epicName,
      });
    }

    // Story points if available
    if (issue.fields[fieldConfig.storyPointsField]) {
      accessories.push({
        text: `${issue.fields[fieldConfig.storyPointsField]}p`,
        icon: Icon.Stars,
        tooltip: "Story Points",
      });
    }

    // Status with color
    if (fieldVisibility.status) {
      accessories.push({
        text: issue.fields.status.name.padEnd(15, " "),
        icon: { source: Icon.Circle, tintColor: getStatusColor(issue.fields.status.name) },
      });
    }

    // Time estimate if present
    if (fieldVisibility.remainingTime && issue.fields.timetracking.remainingEstimateSeconds) {
      const estimate = formatTimeEstimate(issue.fields.timetracking.remainingEstimateSeconds);
      accessories.push({
        text: estimate.padEnd(4, " "),
        icon: Icon.Clock,
        tooltip: "Remaining Time",
      });
    }

    // Assignee if present
    if (fieldVisibility.assignee && issue.fields.assignee) {
      accessories.push({
        text: issue.fields.assignee.displayName.padEnd(15, " "),
        icon: issue.fields.assignee.avatarUrls["24x24"],
        tooltip: "Assignee",
      });
    }

    // Priority if enabled
    if (fieldVisibility.priority) {
      accessories.push({
        icon: issue.fields.priority.iconUrl,
        tooltip: `Priority: ${issue.fields.priority.name}`,
      });
    }

    return accessories;
  };

  const totalTime = calculateTotalTime();
  const sortedIssues = sortIssues(issues);

  // Save field visibility preferences
  const updateFieldVisibility = async (newVisibility: FieldVisibility) => {
    setFieldVisibility(newVisibility);
    await LocalStorage.setItem("field-visibility", JSON.stringify(newVisibility));
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search issues..."
      navigationTitle={`${sprint.name} (${calculateProgress()})`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort Issues"
          storeValue={true}
          onChange={(newValue) => setSortField(newValue as SortField)}
          value={sortField}
        >
          <List.Dropdown.Item title="Sort by Status" value="status" icon={Icon.Circle} />
          <List.Dropdown.Item title="Sort by Remaining Time" value="remaining" icon={Icon.Clock} />
          <List.Dropdown.Item title="Sort by Priority" value="priority" icon={Icon.ExclamationMark} />
          <List.Dropdown.Item title="Sort by Assignee" value="assignee" icon={Icon.Person} />
          <List.Dropdown.Item title="Sort by Epic" value="epic" icon={Icon.Tag} />
        </List.Dropdown>
      }
    >
      <List.Section title="Sprint Info" subtitle={`${sprint.name} • ${issues.length} issues`}>
        <List.Item
          title="Sprint Goal"
          subtitle={sprint.goal || "No sprint goal set"}
          accessories={[
            {
              text: `${new Date(sprint.startDate).toLocaleDateString()} - ${new Date(
                sprint.endDate,
              ).toLocaleDateString()}`,
            },
          ]}
        />
        <List.Item
          title="Time Tracking"
          icon={Icon.Clock}
          accessories={[
            {
              text: "Original Estimate",
              icon: Icon.Calendar,
              tooltip: "Total original estimate for all issues",
            },
            { text: totalTime.original },
            {
              text: "Remaining",
              icon: Icon.Hourglass,
              tooltip: "Total remaining time for all issues",
            },
            { text: totalTime.remaining },
          ]}
        />
      </List.Section>

      <List.Section title="Issues">
        {sortedIssues.map((issue) => (
          <List.Item
            key={issue.id}
            title={{
              value: formatTitle(issue.fields.summary, issue.key, issue.fields[fieldConfig.epicLinkField]),
              tooltip: `${issue.key}: ${issue.fields.summary}${
                typeof issue.fields[fieldConfig.epicLinkField] === "string"
                  ? ` [${issue.fields[fieldConfig.epicLinkField]}]`
                  : ""
              }`,
            }}
            icon={issue.fields.issuetype.iconUrl}
            accessories={getIssueAccessories(issue)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open in Jira" url={`${jiraUrl}/browse/${issue.key}`} icon={Icon.Link} />
                  <Action.CopyToClipboard
                    title="Copy Issue Key"
                    content={issue.key}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Issue Link"
                    content={`${jiraUrl}/browse/${issue.key}`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Configure Visible Fields"
                    icon={Icon.Eye}
                    shortcut={{ modifiers: ["cmd"], key: "-" }}
                    target={
                      <VisibilityConfiguration
                        fieldVisibility={fieldVisibility}
                        updateFieldVisibility={updateFieldVisibility}
                        sprint={sprint}
                      />
                    }
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
