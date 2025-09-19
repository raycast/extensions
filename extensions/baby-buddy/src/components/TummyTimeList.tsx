import {
  List,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Form,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { BabyBuddyAPI, Child, TummyTimeEntry } from "../api";
import { formatDuration, formatTimeAgo, formatTimeWithTooltip } from "../utils";
import { formatErrorMessage } from "../utils/form-helpers";
import CreateTummyTimeForm from "./CreateTummyTimeForm";

interface TummyTimeListProps {
  child: Child;
}

export default function TummyTimeList({ child }: TummyTimeListProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [tummyTimeEntries, setTummyTimeEntries] = useState<TummyTimeEntry[]>([]);
  const navigation = useNavigation();

  async function fetchTummyTimeEntries() {
    setIsLoading(true);
    try {
      const api = new BabyBuddyAPI();
      const entries = await api.getRecentTummyTime(child.id);
      // Sort by end time, newest first
      entries.sort((a: TummyTimeEntry, b: TummyTimeEntry) => new Date(b.end).getTime() - new Date(a.end).getTime());
      setTummyTimeEntries(entries);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Tummy Time",
        message: formatErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function createTummyTimeAndNavigateBack() {
    await fetchTummyTimeEntries();
    navigation.pop();
  }

  useEffect(() => {
    fetchTummyTimeEntries();
  }, [child.id]);

  async function handleDeleteTummyTime(tummyTime: TummyTimeEntry) {
    if (
      await confirmAlert({
        title: "Delete Tummy Time",
        message: `Are you sure you want to delete this tummy time from ${formatTimeAgo(tummyTime.end)}?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        const api = new BabyBuddyAPI();
        await api.deleteTummyTime(tummyTime.id);
        showToast({
          style: Toast.Style.Success,
          title: "Tummy Time Deleted",
          message: "The tummy time has been deleted",
        });
        fetchTummyTimeEntries();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete Tummy Time",
          message: formatErrorMessage(error),
        });
      }
    }
  }

  function handleCreateTummyTime() {
    // Create a dummy timer with the child's ID
    const dummyTimer = {
      id: 0,
      name: "New Tummy Time",
      start: new Date().toISOString(),
      end: new Date(new Date().getTime() + 1000).toISOString(),
      active: false,
      user: 0,
      child: child.id,
      duration: "0:00:00",
    };

    navigation.push(
      <CreateTummyTimeForm
        timer={dummyTimer}
        childName={`${child.first_name} ${child.last_name}`}
        onEventCreated={createTummyTimeAndNavigateBack}
      />,
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tummy time..."
      actions={
        <ActionPanel>
          <Action title="Create Tummy Time" icon={Icon.Plus} onAction={handleCreateTummyTime} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchTummyTimeEntries} />
        </ActionPanel>
      }
    >
      <List.Section title="Tummy Time">
        {tummyTimeEntries.map((tummyTime) => (
          <TummyTimeListItem
            key={tummyTime.id}
            tummyTime={tummyTime}
            onDelete={() => handleDeleteTummyTime(tummyTime)}
            onCreateTummyTime={handleCreateTummyTime}
            onRefresh={fetchTummyTimeEntries}
            formatDuration={formatDuration}
          />
        ))}
      </List.Section>
    </List>
  );
}

interface TummyTimeListItemProps {
  tummyTime: TummyTimeEntry;
  onDelete: () => void;
  onCreateTummyTime: () => void;
  onRefresh: () => void;
  formatDuration: (duration: string) => string;
}

function TummyTimeListItem({
  tummyTime,
  onDelete,
  onCreateTummyTime,
  onRefresh,
  formatDuration,
}: TummyTimeListItemProps) {
  const navigation = useNavigation();
  const timeInfo = formatTimeWithTooltip(tummyTime.end);

  function handleEdit() {
    navigation.push(
      <EditTummyTimeForm
        tummyTime={tummyTime}
        onTummyTimeUpdated={() => {
          showToast({
            style: Toast.Style.Success,
            title: "Tummy Time Updated",
            message: "The tummy time has been updated",
          });
          navigation.pop();
          // Refresh the tummy time list after editing
          onRefresh();
        }}
      />,
    );
  }

  return (
    <List.Item
      title={`Tummy Time - ${formatDuration(tummyTime.duration)}`}
      subtitle={tummyTime.milestone || ""}
      icon={Icon.Clock}
      accessories={[{ text: timeInfo.text, tooltip: timeInfo.tooltip }]}
      actions={
        <ActionPanel>
          <Action title="Edit Tummy Time" icon={Icon.Pencil} onAction={handleEdit} />
          <Action title="Delete Tummy Time" icon={Icon.Trash} style={Action.Style.Destructive} onAction={onDelete} />
          <Action title="Create Tummy Time" icon={Icon.Plus} onAction={onCreateTummyTime} />
        </ActionPanel>
      }
    />
  );
}

interface EditTummyTimeFormProps {
  tummyTime: TummyTimeEntry;
  onTummyTimeUpdated: () => void;
}

function EditTummyTimeForm({ tummyTime, onTummyTimeUpdated }: EditTummyTimeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date(tummyTime.start));
  const [endTime, setEndTime] = useState<Date>(new Date(tummyTime.end));
  const [milestone, setMilestone] = useState(tummyTime.milestone || "");
  const navigation = useNavigation();

  // Validate that end time is after start time
  const isTimeRangeValid = endTime > startTime;

  async function handleSubmit() {
    if (!isTimeRangeValid) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid time range",
        message: "End time must be after start time",
      });
      return;
    }

    try {
      setIsLoading(true);
      const api = new BabyBuddyAPI();

      // Format dates properly
      const startISOString = startTime.toISOString();
      const endISOString = endTime.toISOString();

      // Prepare the data
      const tummyTimeData = {
        start: startISOString,
        end: endISOString,
        milestone: milestone || "",
      };

      // Update the tummy time entry
      await api.updateTummyTime(tummyTime.id, tummyTimeData);

      onTummyTimeUpdated();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Tummy Time",
        message: formatErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Tummy Time" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={() => navigation.pop()} />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="startTime"
        title="Start Time"
        value={startTime}
        onChange={(newValue: Date | null) => newValue && setStartTime(newValue)}
      />

      <Form.DatePicker
        id="endTime"
        title="End Time"
        value={endTime}
        onChange={(newValue: Date | null) => newValue && setEndTime(newValue)}
      />

      {!isTimeRangeValid && <Form.Description title="Error" text="⚠️ End time must be after start time" />}

      <Form.Separator />

      <Form.TextField
        id="milestone"
        title="Milestone"
        placeholder="Enter any milestone achieved (optional)"
        value={milestone}
        onChange={setMilestone}
      />
    </Form>
  );
}
