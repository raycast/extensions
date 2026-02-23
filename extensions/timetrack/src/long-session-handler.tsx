import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import { TimeTracker, ActiveTracking } from "./timeTracker";

interface LongSessionHandlerProps {
  activeTracking: ActiveTracking;
  onComplete: () => void;
}

export function LongSessionHandler({
  activeTracking,
  onComplete,
}: LongSessionHandlerProps) {
  const [selectedOption, setSelectedOption] = useState<
    "one_hour" | "custom_time" | "keep_full"
  >("one_hour");
  const [customTime, setCustomTime] = useState<Date>(new Date());

  const totalMinutes = Math.round(
    (new Date().getTime() - activeTracking.startTime.getTime()) / 60000,
  );
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const startTimeText = activeTracking.startTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  async function handleSubmit() {
    const tracker = new TimeTracker();

    if (selectedOption === "one_hour") {
      // Stop with custom end time = start time + 1 hour
      const endTime = new Date(activeTracking.startTime);
      endTime.setHours(endTime.getHours() + 1);
      tracker.stopTrackingWithEndTime(endTime);

      await showToast({
        style: Toast.Style.Success,
        title: "Recorded as 1 Hour",
        message: `"${activeTracking.client}" - capped at 1 hour`,
      });
    } else if (selectedOption === "custom_time") {
      // Validate custom time is after start time
      if (customTime <= activeTracking.startTime) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Time",
          message: "Stop time must be after start time",
        });
        return;
      }

      tracker.stopTrackingWithEndTime(customTime);

      const customMinutes = Math.round(
        (customTime.getTime() - activeTracking.startTime.getTime()) / 60000,
      );
      const duration = tracker.formatDuration(customMinutes);

      await showToast({
        style: Toast.Style.Success,
        title: "Recorded Custom Duration",
        message: `"${activeTracking.client}" - ${duration}`,
      });
    } else {
      // Keep full duration
      const entry = tracker.stopTracking();
      const duration = tracker.formatDuration(entry?.durationMinutes || 0);

      await showToast({
        style: Toast.Style.Success,
        title: "Kept Full Duration",
        message: `"${activeTracking.client}" - ${duration}`,
      });
    }

    onComplete();
    await popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={handleSubmit}
            icon={Icon.Check}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Long-Running Session Detected"
        text={`"${activeTracking.client}" has been running for ${durationText} (starting at ${startTimeText})`}
      />

      <Form.Dropdown
        id="option"
        title="How to Record"
        value={selectedOption}
        onChange={(value) =>
          setSelectedOption(value as "one_hour" | "custom_time" | "keep_full")
        }
      >
        <Form.Dropdown.Item
          value="one_hour"
          title="Record as 1 Hour"
          icon={Icon.Clock}
        />
        <Form.Dropdown.Item
          value="custom_time"
          title="Specify Stop Time"
          icon={Icon.Pencil}
        />
        <Form.Dropdown.Item
          value="keep_full"
          title="Keep Full Duration"
          icon={Icon.CheckCircle}
        />
      </Form.Dropdown>

      {selectedOption === "custom_time" && (
        <Form.DatePicker
          id="customTime"
          title="Stop Time"
          value={customTime}
          onChange={(date) => date && setCustomTime(date)}
          type={Form.DatePicker.Type.DateTime}
        />
      )}
    </Form>
  );
}
