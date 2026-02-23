import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Form,
  useNavigation,
} from "@raycast/api";
import { TimeTracker, TimeEntry } from "./timeTracker";
import { useEffect, useState } from "react";

interface DayGroup {
  date: Date;
  dateString: string;
  entries: TimeEntry[];
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [dayGroups, setDayGroups] = useState<DayGroup[]>([]);
  const { push } = useNavigation();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setIsLoading(true);
    const tracker = new TimeTracker();
    const entries = tracker.getAllEntries();
    const groups = groupEntriesByDay(entries);
    setDayGroups(groups);
    setIsLoading(false);
  };

  const groupEntriesByDay = (entries: TimeEntry[]): DayGroup[] => {
    const dayMap = new Map<string, DayGroup>();

    for (const entry of entries) {
      const date = new Date(entry.startTime);
      date.setHours(0, 0, 0, 0);
      const dateString = formatDate(date);

      if (!dayMap.has(dateString)) {
        dayMap.set(dateString, {
          date,
          dateString,
          entries: [],
        });
      }

      dayMap.get(dateString)!.entries.push(entry);
    }

    // Sort entries within each day by start time (most recent first)
    for (const group of dayMap.values()) {
      group.entries.sort(
        (a, b) => b.startTime.getTime() - a.startTime.getTime(),
      );
    }

    return Array.from(dayMap.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);

    if (dateToCheck.getTime() === today.getTime()) {
      return "Today";
    } else if (dateToCheck.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const handleDelete = async (entry: TimeEntry) => {
    const confirmed = await confirmAlert({
      title: "Delete Entry",
      message: `Delete ${entry.client} entry from ${entry.startTime.toLocaleString()}?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const tracker = new TimeTracker();
      tracker.deleteEntry(entry);
      await showToast({
        style: Toast.Style.Success,
        title: "Entry Deleted",
      });
      loadData();
    }
  };

  const handleEdit = (entry: TimeEntry) => {
    push(<EditEntryForm entry={entry} onEdit={loadData} />);
  };

  const handleAdd = () => {
    push(<AddEntryForm onAdd={loadData} />);
  };

  const tracker = new TimeTracker();

  return (
    <List isLoading={isLoading}>
      <List.Section>
        <List.Item
          title="Add New Entry"
          icon={{ source: Icon.Plus, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action title="Add Entry" icon={Icon.Plus} onAction={handleAdd} />
            </ActionPanel>
          }
        />
      </List.Section>

      {dayGroups.map((group) => (
        <List.Section
          key={group.dateString}
          title={group.dateString}
          subtitle={tracker.formatDuration(
            group.entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0),
          )}
        >
          {group.entries.map((entry, index) => (
            <List.Item
              key={`${group.dateString}-${index}`}
              title={entry.client}
              subtitle={`${entry.startTime.toLocaleTimeString()} - ${entry.endTime?.toLocaleTimeString()}`}
              accessories={[
                {
                  tag: {
                    value: tracker.formatDuration(entry.durationMinutes || 0),
                    color: Color.Blue,
                  },
                  icon: Icon.Clock,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Edit Entry"
                    icon={Icon.Pencil}
                    onAction={() => handleEdit(entry)}
                  />
                  <Action
                    title="Delete Entry"
                    icon={Icon.Trash}
                    onAction={() => handleDelete(entry)}
                  />
                  <Action
                    title="Add New Entry"
                    icon={Icon.Plus}
                    onAction={handleAdd}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={loadData}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {dayGroups.length === 0 && !isLoading && (
        <List.Section>
          <List.Item title="No entries found" icon={Icon.Calendar} />
        </List.Section>
      )}
    </List>
  );
}

function AddEntryForm({ onAdd }: { onAdd: () => void }) {
  const { pop } = useNavigation();
  const [clientError, setClientError] = useState<string | undefined>();
  const [dateError, setDateError] = useState<string | undefined>();
  const [startTimeError, setStartTimeError] = useState<string | undefined>();
  const [endTimeError, setEndTimeError] = useState<string | undefined>();

  const handleSubmit = async (values: {
    client: string;
    date: Date;
    startTime: string;
    endTime: string;
  }) => {
    setClientError(undefined);
    setDateError(undefined);
    setStartTimeError(undefined);
    setEndTimeError(undefined);

    if (!values.client.trim()) {
      setClientError("Client name is required");
      return;
    }

    if (!values.date) {
      setDateError("Date is required");
      return;
    }

    if (!values.startTime) {
      setStartTimeError("Start time is required");
      return;
    }

    if (!values.endTime) {
      setEndTimeError("End time is required");
      return;
    }

    // Parse time strings (HH:MM format)
    const startParts = values.startTime.split(":");
    const endParts = values.endTime.split(":");

    if (startParts.length !== 2 || endParts.length !== 2) {
      setStartTimeError("Use HH:MM format");
      setEndTimeError("Use HH:MM format");
      return;
    }

    const startHour = parseInt(startParts[0], 10);
    const startMinute = parseInt(startParts[1], 10);
    const endHour = parseInt(endParts[0], 10);
    const endMinute = parseInt(endParts[1], 10);

    if (
      isNaN(startHour) ||
      isNaN(startMinute) ||
      isNaN(endHour) ||
      isNaN(endMinute)
    ) {
      setStartTimeError("Invalid time format");
      setEndTimeError("Invalid time format");
      return;
    }

    // Create full datetime objects
    const startTime = new Date(values.date);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(values.date);
    endTime.setHours(endHour, endMinute, 0, 0);

    // Handle case where end time is past midnight
    if (endTime <= startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    try {
      const tracker = new TimeTracker();
      tracker.addEntry(values.client, startTime, endTime);
      await showToast({
        style: Toast.Style.Success,
        title: "Entry Added",
        message: `Added ${tracker.formatDuration(Math.round((endTime.getTime() - startTime.getTime()) / 60000))} for ${values.client}`,
      });
      onAdd();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Entry",
        message: String(error),
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Entry"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="client"
        title="Client"
        placeholder="client 1"
        error={clientError}
        onChange={() => setClientError(undefined)}
      />
      <Form.DatePicker
        id="date"
        title="Date"
        error={dateError}
        onChange={() => setDateError(undefined)}
      />
      <Form.TextField
        id="startTime"
        title="Start Time"
        placeholder="09:00"
        error={startTimeError}
        onChange={() => setStartTimeError(undefined)}
      />
      <Form.TextField
        id="endTime"
        title="End Time"
        placeholder="10:30"
        error={endTimeError}
        onChange={() => setEndTimeError(undefined)}
      />
      <Form.Description text="Time format: HH:MM (24-hour). Entry will be rounded to 15-minute increments." />
    </Form>
  );
}

function EditEntryForm({
  entry,
  onEdit,
}: {
  entry: TimeEntry;
  onEdit: () => void;
}) {
  const { pop } = useNavigation();
  const [clientError, setClientError] = useState<string | undefined>();
  const [dateError, setDateError] = useState<string | undefined>();
  const [startTimeError, setStartTimeError] = useState<string | undefined>();
  const [endTimeError, setEndTimeError] = useState<string | undefined>();

  const formatTimeForInput = (date: Date): string => {
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  const handleSubmit = async (values: {
    client: string;
    date: Date;
    startTime: string;
    endTime: string;
  }) => {
    setClientError(undefined);
    setDateError(undefined);
    setStartTimeError(undefined);
    setEndTimeError(undefined);

    if (!values.client.trim()) {
      setClientError("Client name is required");
      return;
    }

    if (!values.date) {
      setDateError("Date is required");
      return;
    }

    if (!values.startTime) {
      setStartTimeError("Start time is required");
      return;
    }

    if (!values.endTime) {
      setEndTimeError("End time is required");
      return;
    }

    // Parse time strings (HH:MM format)
    const startParts = values.startTime.split(":");
    const endParts = values.endTime.split(":");

    if (startParts.length !== 2 || endParts.length !== 2) {
      setStartTimeError("Use HH:MM format");
      setEndTimeError("Use HH:MM format");
      return;
    }

    const startHour = parseInt(startParts[0], 10);
    const startMinute = parseInt(startParts[1], 10);
    const endHour = parseInt(endParts[0], 10);
    const endMinute = parseInt(endParts[1], 10);

    if (
      isNaN(startHour) ||
      isNaN(startMinute) ||
      isNaN(endHour) ||
      isNaN(endMinute)
    ) {
      setStartTimeError("Invalid time format");
      setEndTimeError("Invalid time format");
      return;
    }

    // Create full datetime objects
    const startTime = new Date(values.date);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(values.date);
    endTime.setHours(endHour, endMinute, 0, 0);

    // Handle case where end time is past midnight
    if (endTime <= startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    try {
      const tracker = new TimeTracker();
      const actualMinutes = Math.round(
        (endTime.getTime() - startTime.getTime()) / 60000,
      );
      const updatedEntry: TimeEntry = {
        client: values.client,
        startTime,
        endTime,
        durationMinutes: tracker.roundDuration(actualMinutes),
      };

      tracker.updateEntry(entry, updatedEntry);
      await showToast({
        style: Toast.Style.Success,
        title: "Entry Updated",
        message: `Updated ${values.client}`,
      });
      onEdit();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Entry",
        message: String(error),
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Entry"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="client"
        title="Client"
        placeholder="client 1"
        defaultValue={entry.client}
        error={clientError}
        onChange={() => setClientError(undefined)}
      />
      <Form.DatePicker
        id="date"
        title="Date"
        defaultValue={entry.startTime}
        error={dateError}
        onChange={() => setDateError(undefined)}
      />
      <Form.TextField
        id="startTime"
        title="Start Time"
        placeholder="09:00"
        defaultValue={formatTimeForInput(entry.startTime)}
        error={startTimeError}
        onChange={() => setStartTimeError(undefined)}
      />
      <Form.TextField
        id="endTime"
        title="End Time"
        placeholder="10:30"
        defaultValue={entry.endTime ? formatTimeForInput(entry.endTime) : ""}
        error={endTimeError}
        onChange={() => setEndTimeError(undefined)}
      />
      <Form.Description text="Time format: HH:MM (24-hour). Entry will be rounded to 15-minute increments." />
    </Form>
  );
}
