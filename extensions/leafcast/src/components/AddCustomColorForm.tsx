import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import tinycolor from "tinycolor2";

interface Props {
  onSetCustomColor: (value: tinycolor.ColorFormats.HSV) => void;
}

export function AddCustomColorForm({ onSetCustomColor }: Props) {
  const { pop } = useNavigation();
  const [value, setValue] = useState<string>("Red");
  const [error, setError] = useState<string>("");

  function handleSetCustomColor({ color }: { color: string }) {
    const colorObj = tinycolor(color);

    if (colorObj.isValid()) {
      setError("");
      const colorValue = tinycolor(color).toHsv();
      onSetCustomColor(colorValue);

      pop();
    } else {
      setError("Invalid color");
    }
  }

  function handleSetValue(value: string) {
    setValue(value);
    setError("");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSetCustomColor} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="color"
        title="Color"
        value={value}
        onChange={handleSetValue}
        error={error}
        onBlur={() => setError("")}
      />
    </Form>
  );
}
