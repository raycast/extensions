import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Clipboard,
  Form,
  useNavigation,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import {
  format,
  parseISO,
  startOfWeek,
  startOfMonth,
  endOfWeek,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import {
  getEntries,
  getProjects,
  deleteEntry,
  updateEntry,
} from "./utils/storage";
import {
  formatDuration,
  formatDurationDetailed,
  parseDuration,
} from "./utils/duration";
import { TimeEntry, Project } from "./utils/types";
import { getDateFormat } from "./utils/config";

interface EntryWithProject extends TimeEntry {
  project: Project;
}

type TimeFilter = "all" | "today" | "week" | "month";

export default function ViewEntries() {
  const [entries, setEntries] = useState<EntryWithProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<TimeFilter>("all");

  async function loadEntries() {
    try {
      const [entriesList, projectsList] = await Promise.all([
        getEntries(),
        getProjects(true),
      ]);

      // Map entries with their projects
      const entriesWithProjects = entriesList
        .map((entry) => {
          const project = projectsList.find((p) => p.id === entry.projectId);
          if (!project) return null;
          return { ...entry, project };
        })
        .filter((e): e is EntryWithProject => e !== null);

      setEntries(entriesWithProjects);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load entries",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  async function handleDelete(id: string) {
    const confirmed = await confirmAlert({
      title: "Delete Entry",
      message: "Are you sure you want to delete this time entry?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await deleteEntry(id);
      await showToast({
        style: Toast.Style.Success,
        title: "Entry deleted",
      });
      await loadEntries();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete entry",
        message: String(error),
      });
    }
  }

  async function handleCopyAsText(entry: EntryWithProject) {
    const dateFormat = getDateFormat();
    const text = `${entry.project.name} - ${format(parseISO(entry.date), dateFormat)} - ${formatDurationDetailed(entry.duration)}${
      entry.comment ? `\n${entry.comment}` : ""
    }`;

    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
    });
  }

  // Filter entries based on selected time filter
  function getFilteredEntries(): EntryWithProject[] {
    const now = new Date();
    const today = format(now, "yyyy-MM-dd");

    switch (filter) {
      case "today":
        return entries.filter((e) => e.date === today);
      case "week": {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        return entries.filter((e) => {
          const entryDate = parseISO(e.date);
          return isWithinInterval(entryDate, {
            start: weekStart,
            end: weekEnd,
          });
        });
      }
      case "month": {
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        return entries.filter((e) => {
          const entryDate = parseISO(e.date);
          return isWithinInterval(entryDate, {
            start: monthStart,
            end: monthEnd,
          });
        });
      }
      default:
        return entries;
    }
  }

  const filteredEntries = getFilteredEntries();
  const dateFormat = getDateFormat();

  // Calculate total duration
  const totalHours = filteredEntries.reduce(
    (sum, entry) => sum + entry.duration,
    0,
  );

  // Group entries by project
  const groupedEntries = filteredEntries.reduce(
    (acc, entry) => {
      const key = entry.project.name;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(entry);
      return acc;
    },
    {} as Record<string, EntryWithProject[]>,
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search entries..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Time Period"
          value={filter}
          onChange={(value) => setFilter(value as TimeFilter)}
        >
          <List.Dropdown.Item title="All Time" value="all" />
          <List.Dropdown.Item title="Today" value="today" />
          <List.Dropdown.Item title="This Week" value="week" />
          <List.Dropdown.Item title="This Month" value="month" />
        </List.Dropdown>
      }
    >
      <List.Section
        title="Summary"
        subtitle={`${filteredEntries.length} entries`}
      >
        <List.Item
          title="Total Time"
          subtitle={formatDurationDetailed(totalHours)}
          accessories={[{ text: formatDuration(totalHours), icon: Icon.Clock }]}
        />
      </List.Section>

      {Object.entries(groupedEntries).map(([projectName, projectEntries]) => {
        const projectTotal = projectEntries.reduce(
          (sum, e) => sum + e.duration,
          0,
        );
        const projectColor = projectEntries[0]?.project.color;

        return (
          <List.Section
            key={projectName}
            title={projectName}
            subtitle={`${projectEntries.length} entries • ${formatDuration(projectTotal)}`}
          >
            {projectEntries.map((entry) => (
              <List.Item
                key={entry.id}
                title={format(parseISO(entry.date), dateFormat)}
                subtitle={entry.comment || "No comment"}
                icon={{ source: Icon.Circle, tintColor: projectColor }}
                accessories={[
                  { text: formatDuration(entry.duration), icon: Icon.Clock },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Edit Entry"
                      icon={Icon.Pencil}
                      target={<EditEntry entry={entry} onSave={loadEntries} />}
                    />
                    <Action
                      title="Copy as Text"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      onAction={() => handleCopyAsText(entry)}
                    />
                    <Action
                      title="Delete Entry"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleDelete(entry.id)}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

// Edit entry form
function EditEntry({
  entry,
  onSave,
}: {
  entry: EntryWithProject;
  onSave: () => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: {
    duration: string;
    comment: string;
    date: Date;
  }) {
    try {
      const duration = parseDuration(values.duration);
      if (!duration || duration <= 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid duration",
          message: "Please enter a valid duration",
        });
        return;
      }

      await updateEntry(entry.id, {
        duration,
        comment: values.comment.trim(),
        date: format(values.date, "yyyy-MM-dd"),
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Entry updated",
      });

      onSave();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update entry",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Project" text={entry.project.name} />
      <Form.TextField
        id="duration"
        title="Duration"
        placeholder="2.5, 2h30, 2:30"
        defaultValue={formatDuration(entry.duration)}
      />
      <Form.DatePicker
        id="date"
        title="Date"
        defaultValue={parseISO(entry.date)}
      />
      <Form.TextArea
        id="comment"
        title="Comment"
        placeholder="What did you work on?"
        defaultValue={entry.comment}
      />
    </Form>
  );
}
