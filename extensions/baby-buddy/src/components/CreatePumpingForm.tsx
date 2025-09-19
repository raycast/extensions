import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { BabyBuddyAPI, Timer } from "../api";
import axios from "axios";
import { showFailureToast } from "@raycast/utils";

interface CreatePumpingFormProps {
  timer: Timer;
  childName: string;
  onEventCreated: () => void;
}

export default function CreatePumpingForm({ timer, childName, onEventCreated }: CreatePumpingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date(timer.start));
  const [endTime, setEndTime] = useState<Date>(timer.end ? new Date(timer.end) : new Date());
  const navigation = useNavigation();

  async function handleSubmit(values: { amount?: string; notes?: string }) {
    if (!isTimeRangeValid) {
      await showFailureToast({
        title: "Invalid Time Range",
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

      // Create the pumping entry
      await api.createPumping({
        child: timer.child,
        start: startISOString,
        end: endISOString,
        amount: values.amount ? parseFloat(values.amount) : null,
        notes: values.notes || "",
      });

      // Delete the timer
      await api.deleteTimer(timer.id);

      await showToast({
        style: Toast.Style.Success,
        title: "Pumping Created",
        message: `Pumping entry created for ${childName}`,
      });

      // Call the callback to refresh the timer list
      onEventCreated();

      // Navigate back to the main list (pop all the way back)
      navigation.pop();
      navigation.pop(); // Pop twice to get back to the main timer list
    } catch (error: unknown) {
      console.error("Failed to create pumping:", error);
      setIsLoading(false);

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

      await showFailureToast({
        title: "Failed to Create Pumping",
        message: errorMessage,
      });
    }
  }

  // Validate that end time is after start time
  const isTimeRangeValid = endTime > startTime;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Pumping" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={() => navigation.pop()} />
        </ActionPanel>
      }
    >
      <Form.Description title="Create Pumping" text={`Create a pumping entry for ${childName}`} />

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

      <Form.TextField id="amount" title="Amount" placeholder="Enter amount" />

      <Form.TextArea id="notes" title="Notes" placeholder="Enter any notes about this pumping session" />
    </Form>
  );
}
