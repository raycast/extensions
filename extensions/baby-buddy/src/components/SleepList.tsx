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
import { BabyBuddyAPI, Child, SleepEntry } from "../api";
import { formatDuration, formatTimeAgo, formatTimeWithTooltip } from "../utils";
import { formatErrorMessage } from "../utils/form-helpers";
import CreateSleepForm from "./CreateSleepForm";
import { showFailureToast } from "@raycast/utils";

interface SleepListProps {
  child: Child;
}

export default function SleepList({ child }: SleepListProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const navigation = useNavigation();

  async function fetchSleepEntries() {
    try {
      setIsLoading(true);
      const api = new BabyBuddyAPI();
      // Get all sleep entries for this child, sorted by newest first
      const sleepData = await api.getSleep(child.id, "", 100);
      setSleepEntries(sleepData);
      setIsLoading(false);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch sleep entries",
        message: formatErrorMessage(error),
      });
      setIsLoading(false);
    }
  }

  async function createSleepAndNavigateBack() {
    await fetchSleepEntries();
    navigation.pop();
    console.log("Sleep entry created and navigation popped");
  }

  useEffect(() => {
    fetchSleepEntries();
  }, [child.id]);

  async function handleDeleteSleep(sleep: SleepEntry) {
    if (
      await confirmAlert({
        title: "Delete Sleep Entry",
        message: `Are you sure you want to delete this sleep entry from ${formatTimeAgo(sleep.end)}?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        setIsLoading(true);
        const api = new BabyBuddyAPI();
        await api.deleteSleep(sleep.id);
        showToast({
          style: Toast.Style.Success,
          title: "Sleep entry deleted",
        });
        await fetchSleepEntries();
      } catch (error) {
        showFailureToast({
          title: "Failed to delete sleep entry",
          message: formatErrorMessage(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sleep entries..."
      navigationTitle={`${child.first_name}'s Sleep`}
      actions={
        <ActionPanel>
          <Action.Push
            title="Create Sleep Entry"
            icon={Icon.Plus}
            target={
              <CreateSleepForm
                timer={{
                  id: 0,
                  name: "Sleep",
                  start: new Date().toISOString(),
                  end: null,
                  duration: null,
                  active: false,
                  user: 0,
                  child: child.id,
                }}
                childName={child.first_name}
                onEventCreated={createSleepAndNavigateBack}
              />
            }
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={fetchSleepEntries}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {sleepEntries.map((sleep) => (
        <SleepListItem
          key={sleep.id}
          sleep={sleep}
          childName={child.first_name}
          onSleepDeleted={() => handleDeleteSleep(sleep)}
          onSleepCreated={createSleepAndNavigateBack}
          onSleepUpdated={fetchSleepEntries}
        />
      ))}
    </List>
  );
}

interface SleepListItemProps {
  sleep: SleepEntry;
  childName: string;
  onSleepDeleted: () => void;
  onSleepCreated: () => void;
  onSleepUpdated: () => void;
}

function SleepListItem({ sleep, childName, onSleepDeleted, onSleepCreated, onSleepUpdated }: SleepListItemProps) {
  const timeInfo = formatTimeWithTooltip(sleep.end);

  // Get icon based on nap status
  const getSleepIcon = (isNap: boolean) => {
    return isNap ? Icon.Sun : Icon.Moon;
  };

  return (
    <List.Item
      title={sleep.nap ? "Nap" : "Sleep"}
      subtitle={sleep.notes || ""}
      accessories={[{ text: timeInfo.text, tooltip: timeInfo.tooltip }, { text: sleep.duration || "" }]}
      icon={getSleepIcon(sleep.nap)}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Type" text={sleep.nap ? "Nap" : "Night Sleep"} />
              <List.Item.Detail.Metadata.Label title="Duration" text={formatDuration(sleep.duration)} />
              <List.Item.Detail.Metadata.Label title="Start" text={new Date(sleep.start).toLocaleString()} />
              <List.Item.Detail.Metadata.Label title="End" text={new Date(sleep.end).toLocaleString()} />
              <List.Item.Detail.Metadata.Separator />
              {sleep.notes && <List.Item.Detail.Metadata.Label title="Notes" text={sleep.notes} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Sleep Entry"
            icon={Icon.Pencil}
            target={<EditSleepForm sleep={sleep} childName={childName} onSleepUpdated={onSleepUpdated} />}
          />
          <Action
            title="Delete Sleep Entry"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={onSleepDeleted}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
          <Action.Push
            title="Create Sleep Entry"
            icon={Icon.Plus}
            target={
              <CreateSleepForm
                timer={{
                  id: 0,
                  name: "Sleep",
                  start: new Date().toISOString(),
                  end: null,
                  duration: null,
                  active: false,
                  user: 0,
                  child: sleep.child,
                }}
                childName={childName}
                onEventCreated={onSleepCreated}
              />
            }
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onSleepUpdated}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}

interface EditSleepFormProps {
  sleep: SleepEntry;
  childName: string;
  onSleepUpdated: () => void;
}

function EditSleepForm({ sleep, childName, onSleepUpdated }: EditSleepFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date(sleep.start));
  const [endTime, setEndTime] = useState<Date>(new Date(sleep.end));
  const [isNap, setIsNap] = useState(sleep.nap);
  const [notes, setNotes] = useState(sleep.notes || "");
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

      await api.updateSleep(sleep.id, {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        nap: isNap,
        notes,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Sleep entry updated",
      });

      onSleepUpdated();
      navigation.pop();
    } catch (error) {
      showFailureToast({
        title: "Failed to update sleep entry",
        message: formatErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit Sleep Entry for ${childName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Sleep Entry" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="startTime"
        title="Start Time"
        value={startTime}
        onChange={(newValue) => newValue && setStartTime(newValue)}
      />

      <Form.DatePicker
        id="endTime"
        title="End Time"
        value={endTime}
        onChange={(newValue) => newValue && setEndTime(newValue)}
      />

      {!isTimeRangeValid && <Form.Description title="Error" text="⚠️ End time must be after start time" />}

      <Form.Checkbox id="isNap" label="Is Nap" value={isNap} onChange={setIsNap} />

      <Form.TextArea id="notes" title="Notes" placeholder="Enter notes" value={notes} onChange={setNotes} />
    </Form>
  );
}
