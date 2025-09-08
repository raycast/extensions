import React, { useState } from "react";
import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import createEvent from "./tools/create-whentomeet-event";

type TimeSlot = {
  dateTime: Date | undefined;
};

type FormValues = {
  title: string;
  description: string;
  slotLength: string;
  timeSlots: TimeSlot[];
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ dateTime: undefined }]);

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { dateTime: undefined }]);
  };

  const removeTimeSlot = (index: number) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter((_, i) => i !== index));
    }
  };

  const updateTimeSlot = (index: number, dateTime: Date | undefined) => {
    const updatedSlots = [...timeSlots];
    updatedSlots[index] = { dateTime };
    setTimeSlots(updatedSlots);
  };

  const convertToISOSlots = (slots: TimeSlot[], slotLength: number): string[] => {
    return slots
      .filter((slot) => slot.dateTime)
      .map((slot) => {
        const startDateTime = slot.dateTime!;
        const endDateTime = new Date(startDateTime.getTime() + slotLength * 60 * 1000);

        // Format as YYYY-MM-DDTHH:mm:ssZ to match documentation examples
        const formatDateTime = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          const seconds = String(date.getSeconds()).padStart(2, "0");
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
        };

        return `${formatDateTime(startDateTime)},${formatDateTime(endDateTime)}`;
      });
  };

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);

    try {
      // Validate required fields
      if (!values.title.trim()) {
        await showFailureToast({
          title: "Title Required",
          message: "Please enter an event title",
        });
        return;
      }

      // Parse slot length
      const slotLength = values.slotLength ? parseInt(values.slotLength, 10) : 60;
      if (isNaN(slotLength) || slotLength <= 0) {
        await showFailureToast({
          title: "Invalid Slot Length",
          message: "Slot length must be a positive number",
        });
        return;
      }

      // Convert time slots to ISO format (empty slots will be filtered out)
      const isoSlots = convertToISOSlots(timeSlots, slotLength);

      // Validate that at least one time slot is provided
      if (isoSlots.length === 0) {
        await showFailureToast({
          title: "No Time Slots",
          message: "Please add at least one time slot for your event",
        });
        return;
      }

      // Import and call the create event tool
      await createEvent({
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        slotLength,
        slots: isoSlots,
      });
    } catch (error) {
      console.error("Error creating event:", error);
      await showFailureToast({
        title: "Error Creating Event",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isLoading ? "Creating Event…" : "Create WhenToMeet Event"}
            icon={isLoading ? Icon.Clock : Icon.Calendar}
            onSubmit={handleSubmit}
          />
          <Action title="Add Time Slot" icon={Icon.Plus} onAction={addTimeSlot} />
          {timeSlots.map(
            (_, index) =>
              timeSlots.length > 1 && (
                <Action
                  key={index}
                  title={`Remove Time Slot ${index + 1}`}
                  icon={Icon.Minus}
                  onAction={() => removeTimeSlot(index)}
                />
              ),
          )}
          {timeSlots.length > 1 && (
            <Action
              title="Remove All Time Slots"
              icon={Icon.Trash}
              onAction={() => setTimeSlots([{ dateTime: undefined }])}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Event Title"
        placeholder="e.g., Team Standup, Client Meeting"
        info="The title of your WhenToMeet event"
      />

      <Form.TextArea
        id="description"
        title="Description (Optional)"
        placeholder="e.g., Weekly team sync to discuss progress and blockers"
        info="Optional description for the event"
      />

      <Form.TextField
        id="slotLength"
        title="Slot Length (minutes)"
        placeholder="60"
        defaultValue="60"
        info="Duration of each time slot in minutes (default: 60)"
      />

      <Form.Description
        title="Time Slots (Optional)"
        text="Configure preset time slots for your event, or leave empty to let participants choose their own times"
      />

      {timeSlots.map((slot, index) => (
        <React.Fragment key={index}>
          <Form.Description title={`Time Slot ${index + 1}`} text="Configure date and time for this slot" />

          <Form.DatePicker
            id={`dateTime-${index}`}
            title="Date & Time"
            value={slot.dateTime || null}
            onChange={(dateTime) => updateTimeSlot(index, dateTime || undefined)}
            info="Select the date and time for this slot. End time will be calculated automatically based on slot length."
          />
        </React.Fragment>
      ))}

      <Form.Description
        title="Time Slot Management"
        text="Use 'Add Time Slot' to add more slots, or 'Remove All Time Slots' to create an event without preset times"
      />
    </Form>
  );
}
