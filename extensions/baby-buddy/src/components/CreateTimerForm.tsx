import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { BabyBuddyAPI, Child } from "../api";
import { TIMER_TYPES } from "../utils/constants";
import { formatErrorMessage, getTimerName } from "../utils/form-helpers";

interface CreateTimerFormProps {
  onTimerCreated: () => void;
}

export default function CreateTimerForm({ onTimerCreated }: CreateTimerFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [customName, setCustomName] = useState<string>("");
  const [selectedTimerType, setSelectedTimerType] = useState<string>("feeding");
  const [startDateTime, setStartDateTime] = useState<Date>(new Date());
  const { pop } = useNavigation();

  useEffect(() => {
    async function fetchChildren() {
      try {
        setIsLoading(true);
        const api = new BabyBuddyAPI();
        const childrenData = await api.getChildren();
        setChildren(childrenData);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch children",
          message: formatErrorMessage(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchChildren();
  }, []);

  async function handleSubmit(values: { childId: string; timerType: string; customName: string; startDateTime: Date }) {
    try {
      const api = new BabyBuddyAPI();
      const childId = parseInt(values.childId);

      // Determine the timer name using the utility function
      const timerName = getTimerName(values.timerType, values.customName);

      // Use the datetime directly
      const startISOString = values.startDateTime.toISOString();

      await api.createTimer(childId, timerName, startISOString);

      await showToast({
        style: Toast.Style.Success,
        title: "Timer Created",
        message: `${timerName} timer created`,
      });

      onTimerCreated();
      pop();
    } catch (error) {
      console.error("Failed to create timer:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Create Timer",
        message: formatErrorMessage(error),
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Timer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="childId" title="Child" placeholder="Select a child">
        {children.map((child) => (
          <Form.Dropdown.Item
            key={child.id}
            value={child.id.toString()}
            title={`${child.first_name} ${child.last_name}`}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="timerType"
        title="Timer Type"
        value={selectedTimerType}
        onChange={(newValue) => setSelectedTimerType(newValue)}
      >
        {TIMER_TYPES.map((type) => (
          <Form.Dropdown.Item key={type.id} value={type.id} title={type.name} />
        ))}
      </Form.Dropdown>

      {selectedTimerType === "other" && (
        <Form.TextField
          id="customName"
          title="Custom Timer Name"
          placeholder="Enter a custom timer name"
          value={customName}
          onChange={setCustomName}
        />
      )}

      <Form.DatePicker
        id="startDateTime"
        title="Start Time"
        value={startDateTime}
        onChange={(newValue) => newValue && setStartDateTime(newValue)}
      />
    </Form>
  );
}
