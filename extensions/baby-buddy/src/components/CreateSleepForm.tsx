import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { BabyBuddyAPI, Timer } from "../api";
import { createSleepData } from "../utils/form-helpers";
import { formatErrorMessage } from "../utils/formatters";
import { showInvalidTimeRangeError } from "../utils/validators";
import { validateTimeRange } from "../utils/date-helpers";
import { showFailureToast } from "@raycast/utils";

interface CreateSleepFormProps {
  timer: Timer;
  childName: string;
  onEventCreated: () => void;
}

export default function CreateSleepForm({ timer, childName, onEventCreated }: CreateSleepFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState<Date>(() => {
    // Ensure start time is before end time
    const start = new Date(timer.start);
    const end = timer.end ? new Date(timer.end) : new Date();

    // If start time is not before end time, set it 1 second before
    if (start >= end) {
      const newStart = new Date(end);
      newStart.setSeconds(newStart.getSeconds() - 1);
      return newStart;
    }

    return start;
  });
  const [endTime, setEndTime] = useState<Date>(timer.end ? new Date(timer.end) : new Date());
  const [isNap, setIsNap] = useState(false);
  const [notes, setNotes] = useState("");
  const navigation = useNavigation();

  // Validate that end time is after start time
  const isTimeRangeValid = validateTimeRange(startTime, endTime);

  async function handleSubmit() {
    if (!isTimeRangeValid) {
      showInvalidTimeRangeError();
      return;
    }

    try {
      setIsLoading(true);
      const api = new BabyBuddyAPI();

      // Format and prepare the data using utility function
      const sleepData = createSleepData({
        childId: timer.child,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        isNap,
        notes,
      });

      // Create the sleep entry
      await api.createSleep(sleepData);

      // Only delete the timer if it's a real timer (id > 0)
      if (timer.id > 0) {
        await api.deleteTimer(timer.id);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Sleep Entry Created",
        message: `Sleep entry created for ${childName}`,
      });

      // Call the callback to refresh and navigate
      onEventCreated();
    } catch (error: unknown) {
      await showFailureToast({
        title: "Failed to Create Sleep Entry",
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
          <Action.SubmitForm title="Create Sleep Entry" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={() => navigation.pop()} />
        </ActionPanel>
      }
    >
      <Form.Description title="Create Sleep Entry" text={`Create a sleep entry for ${childName}`} />

      <Form.Separator />

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

      <Form.Separator />

      <Form.Checkbox id="isNap" label="Is Nap" value={isNap} onChange={setIsNap} />

      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Enter any notes about this sleep"
        value={notes}
        onChange={setNotes}
      />
    </Form>
  );
}
