import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { BabyBuddyAPI, Timer } from "../api";
import axios from "axios";
import { showFailureToast } from "@raycast/utils";

interface CreateTummyTimeFormProps {
  timer: Timer;
  childName: string;
  onEventCreated: () => void;
}

export default function CreateTummyTimeForm({ timer, childName, onEventCreated }: CreateTummyTimeFormProps) {
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
  const [milestone, setMilestone] = useState("");
  const navigation = useNavigation();

  // Validate that end time is after start time
  const isTimeRangeValid = endTime > startTime;

  async function handleSubmit() {
    if (!isTimeRangeValid) {
      showFailureToast({
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
        child: timer.child,
        start: startISOString,
        end: endISOString,
        milestone: milestone || "",
      };

      // Create the tummy time entry
      await api.createTummyTime(tummyTimeData);

      // Only delete the timer if it's a real timer (id > 0)
      if (timer.id > 0) {
        await api.deleteTimer(timer.id);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Tummy Time Created",
        message: `Tummy time created for ${childName}`,
      });

      // Call the callback to refresh and navigate
      onEventCreated();
    } catch (error: unknown) {
      let errorMessage = "Please try again";

      // Check if it's an Axios error with response data
      if (axios.isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === "object") {
          // Join all error messages
          const messages = Object.entries(errorData)
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ");
          if (messages) {
            errorMessage = messages;
          }
        } else if (typeof errorData === "string") {
          errorMessage = errorData;
        }
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Create Tummy Time",
        message: errorMessage,
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
          <Action.SubmitForm title="Create Tummy Time" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={() => navigation.pop()} />
        </ActionPanel>
      }
    >
      <Form.Description title="Create Tummy Time" text={`Create a tummy time session for ${childName}`} />

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
