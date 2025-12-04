import React, { useState } from "react";
import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import createEvent from "./tools/create-whentomeet-event";

type TimeSlot = {
  dateTime: Date | undefined;
};

type FormValues = {
  title: string;
  description: string;
  slotLength: string;
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

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      setIsLoading(true);

      try {
        // Parse slot length with enhanced validation
        const slotLength = values.slotLength ? parseInt(values.slotLength, 10) : 60;

        if (isNaN(slotLength) || slotLength <= 0) {
          await showFailureToast(new Error("Please enter a positive number for the slot length (e.g., 30, 60, 90)"), {
            title: "Invalid Slot Length",
          });
          setIsLoading(false);
          return;
        }

        if (slotLength > 480) {
          await showFailureToast(
            new Error("Slot length cannot exceed 480 minutes (8 hours). Please enter a shorter duration."),
            {
              title: "Slot Length Too Long",
            },
          );
          setIsLoading(false);
          return;
        }

        // Convert time slots to ISO format (empty slots will be filtered out)
        const isoSlots = convertToISOSlots(timeSlots, slotLength);

        // Validate title length
        const trimmedTitle = values.title.trim();
        if (trimmedTitle.length > 100) {
          await showFailureToast(new Error("Event title must be 100 characters or less. Please shorten your title."), {
            title: "Title Too Long",
          });
          setIsLoading(false);
          return;
        }

        // Validate description length
        const trimmedDescription = values.description.trim();
        if (trimmedDescription.length > 500) {
          await showFailureToast(
            new Error("Event description must be 500 characters or less. Please shorten your description."),
            {
              title: "Description Too Long",
            },
          );
          setIsLoading(false);
          return;
        }

        // Check for duplicate time slots
        const uniqueSlots = new Set(isoSlots);
        if (uniqueSlots.size !== isoSlots.length) {
          await showFailureToast(
            new Error("You have duplicate time slots. Please remove duplicates or adjust the times."),
            {
              title: "Duplicate Time Slots",
            },
          );
          setIsLoading(false);
          return;
        }

        // Import and call the create event tool
        await createEvent({
          title: trimmedTitle,
          description: trimmedDescription || undefined,
          slotLength,
          slots: isoSlots,
        });
      } catch (error) {
        let errorTitle = "Error Creating Event";
        let errorMessage = "An unexpected error occurred. Please try again.";

        if (error instanceof Error) {
          const errorMsg = error.message.toLowerCase();

          if (errorMsg.includes("url too long")) {
            errorTitle = "Too Many Time Slots";
            errorMessage =
              "You have too many time slots. Please reduce the number of slots or shorten the title/description.";
          } else if (errorMsg.includes("title is required")) {
            errorTitle = "Missing Event Title";
            errorMessage = "Please enter a title for your event.";
          } else if (errorMsg.includes("time slot")) {
            errorTitle = "Time Slot Error";
            errorMessage = "There's an issue with your time slots. Please check that all times are valid.";
          } else if (errorMsg.includes("network") || errorMsg.includes("connection")) {
            errorTitle = "Connection Error";
            errorMessage = "Unable to create event due to connection issues. Please check your internet and try again.";
          } else if (error.message && error.message.trim()) {
            errorMessage = error.message;
          }
        }

        await showFailureToast(new Error(errorMessage), {
          title: errorTitle,
        });
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      title: "",
      description: "",
      slotLength: "60",
    },
    validation: {
      title: (value) => {
        if (!value || !value.trim()) {
          return "Event title is required";
        }
        if (value.trim().length > 100) {
          return "Title must be 100 characters or less";
        }
      },
      description: (value) => {
        if (value && value.trim().length > 500) {
          return "Description must be 500 characters or less";
        }
      },
      slotLength: (value) => {
        if (!value) {
          return "Slot length is required";
        }
        const slotLength = parseInt(value, 10);
        if (isNaN(slotLength)) {
          return "Slot length must be a number";
        }
        if (slotLength <= 0) {
          return "Slot length must be greater than 0";
        }
        if (slotLength > 480) {
          return "Slot length cannot exceed 480 minutes (8 hours)";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isLoading ? "Creating Event…" : "Create Whentomeet Event"}
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
        title="Event Title"
        placeholder="e.g., Team Standup, Client Meeting"
        info="The title of your WhenToMeet event"
        {...itemProps.title}
      />

      <Form.TextArea
        title="Description (Optional)"
        placeholder="e.g., Weekly team sync to discuss progress and blockers"
        info="Optional description for the event"
        {...itemProps.description}
      />

      <Form.TextField
        title="Slot Length (minutes)"
        placeholder="60"
        info="Duration of each time slot in minutes (default: 60)"
        {...itemProps.slotLength}
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
