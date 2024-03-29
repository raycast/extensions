import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";

interface Props {
  onAddCustomBrightnessValue: (value: number) => void;
}

export function AddCustomBrightnessForm({ onAddCustomBrightnessValue }: Props) {
  const { pop } = useNavigation();
  const [value, setValue] = useState<string>("50");
  const [error, setError] = useState<string>("");

  function handleSetValue(brightnessValue: string) {
    setValue(brightnessValue);
    setError("");
  }

  function handleAddCustomBrightnessValue({ value }: { value: string }) {
    const valueAsNumber = parseInt(value ?? "0", 10);

    if (isNaN(valueAsNumber) || valueAsNumber < 0 || valueAsNumber > 100) {
      setError("Please enter a valid number between 0 and 100");
    } else {
      setError("");
      onAddCustomBrightnessValue(valueAsNumber);

      pop();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleAddCustomBrightnessValue} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="value"
        title="Value"
        info="Must be a number between 0 and 100"
        value={value}
        onChange={handleSetValue}
        onBlur={() => setError("")}
        error={error}
      />
    </Form>
  );
}
