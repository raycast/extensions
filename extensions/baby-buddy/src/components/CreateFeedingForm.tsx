import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { BabyBuddyAPI, Timer } from "../api";
import { FEEDING_TYPES, FEEDING_METHODS } from "../utils/constants";
import { createFeedingData } from "../utils/form-helpers";
import { formatErrorMessage } from "../utils/formatters";
import { showInvalidTimeRangeError } from "../utils/validators";
import { validateTimeRange } from "../utils/date-helpers";
import { showFailureToast } from "@raycast/utils";

interface CreateFeedingFormProps {
  timer: Timer;
  childName: string;
  onEventCreated: () => void;
}

export default function CreateFeedingForm({ timer, childName, onEventCreated }: CreateFeedingFormProps) {
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
  const navigation = useNavigation();

  async function handleSubmit(values: { type: string; method: string; amount?: string; notes?: string }) {
    // Validate that end time is after start time
    if (!validateTimeRange(startTime, endTime)) {
      showInvalidTimeRangeError();
      return;
    }

    try {
      setIsLoading(true);
      const api = new BabyBuddyAPI();

      // Format and prepare the data using utility function
      const feedingData = createFeedingData({
        childId: timer.child,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        type: values.type,
        method: values.method,
        amount: values.amount,
        notes: values.notes || "",
      });

      // Create the feeding entry
      await api.createFeeding(feedingData);

      // Only delete the timer if it's a real timer (id > 0)
      if (timer.id > 0) {
        await api.deleteTimer(timer.id);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Feeding Created",
        message: `Feeding created for ${childName}`,
      });

      // Call the callback to refresh and navigate
      onEventCreated();
    } catch (error: unknown) {
      console.error("Failed to create feeding:", error);

      await showFailureToast({
        title: "Failed to Create Feeding",
        message: formatErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Validate that end time is after start time
  const isTimeRangeValid = validateTimeRange(startTime, endTime);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Feeding" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={() => navigation.pop()} />
        </ActionPanel>
      }
    >
      <Form.Description title="Create Feeding" text={`Create a feeding entry for ${childName}`} />

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

      <Form.Dropdown id="type" title="Type" defaultValue="breast milk">
        {FEEDING_TYPES.map((type) => (
          <Form.Dropdown.Item key={type.id} value={type.id} title={type.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="method" title="Method" defaultValue="bottle">
        {FEEDING_METHODS.map((method) => (
          <Form.Dropdown.Item key={method.id} value={method.id} title={method.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="amount" title="Amount" placeholder="Enter amount" />

      <Form.TextArea id="notes" title="Notes" placeholder="Enter any notes about this feeding" />
    </Form>
  );
}
