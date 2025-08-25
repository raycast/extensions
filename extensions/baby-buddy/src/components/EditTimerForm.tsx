import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useState } from "react";
import { BabyBuddyAPI, Timer } from "../api";
import { formatErrorMessage, prepareTimerUpdateData } from "../utils/form-helpers";
import { showFailureToast } from "@raycast/utils";

interface EditTimerFormProps {
  timer: Timer;
  childName: string;
  onTimerUpdated: () => void;
}

export default function EditTimerForm({ timer, childName, onTimerUpdated }: EditTimerFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [timerName, setTimerName] = useState<string>(timer.name);
  const [startDateTime, setStartDateTime] = useState<Date>(new Date(timer.start));
  const { pop } = useNavigation();

  async function handleSubmit() {
    try {
      setIsLoading(true);
      const api = new BabyBuddyAPI();

      // Format data using the utility function
      const updateData = prepareTimerUpdateData({
        timerName,
        startTime: startDateTime.toISOString(),
      });

      // Update the timer
      await api.updateTimer(timer.id, updateData);

      await showFailureToast({
        title: "Timer Updated",
        message: `${timerName} timer updated`,
      });

      onTimerUpdated();
      pop();
    } catch (error) {
      await showFailureToast({
        title: "Failed to Update Timer",
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
          <Action.SubmitForm title="Update Timer" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={() => pop()} />
        </ActionPanel>
      }
    >
      <Form.Description title="Edit Timer" text={`Edit the "${timer.name}" timer for ${childName}`} />

      <Form.TextField
        id="timerName"
        title="Timer Name"
        placeholder="Enter timer name"
        value={timerName}
        onChange={setTimerName}
      />

      <Form.DatePicker
        id="startDateTime"
        title="Start Time"
        value={startDateTime}
        onChange={(newValue) => newValue && setStartDateTime(newValue)}
      />
    </Form>
  );
}
