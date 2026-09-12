import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useState } from "react";

interface CustomTimeRangeFormProps {
  onApply: (from: Date) => void;
}

/** Form component that lets the user enter a custom numerical time range (e.g. "12 hours ago"). */
export default function CustomTimeRangeForm({ onApply }: CustomTimeRangeFormProps) {
  const { pop } = useNavigation();
  const [valueError, setValueError] = useState<string | undefined>();

  function handleSubmit(values: { value: string; unit: string }) {
    const num = parseInt(values.value, 10);
    if (isNaN(num) || num <= 0) {
      setValueError("Enter a positive number");
      return;
    }
    const from = new Date();
    switch (values.unit) {
      case "hours":
        from.setHours(from.getHours() - num);
        break;
      case "days":
        from.setDate(from.getDate() - num);
        break;
      case "weeks":
        from.setDate(from.getDate() - num * 7);
        break;
      case "months":
        from.setMonth(from.getMonth() - num);
        break;
    }
    onApply(from);
    pop();
  }

  return (
    <Form
      navigationTitle="Custom Time Range"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Filter" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="value"
        title="Value"
        placeholder="e.g. 12"
        error={valueError}
        onChange={() => setValueError(undefined)}
      />
      <Form.Dropdown id="unit" title="Unit" defaultValue="hours">
        <Form.Dropdown.Item value="hours" title="Hours" />
        <Form.Dropdown.Item value="days" title="Days" />
        <Form.Dropdown.Item value="weeks" title="Weeks" />
        <Form.Dropdown.Item value="months" title="Months" />
      </Form.Dropdown>
    </Form>
  );
}
