import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { encodeToTOON } from "./utils/encoder";
import { saveRecent } from "./utils/storage";
import { calculateTokenSavings } from "./utils/encoder";
import { InputFormat } from "./types";

export default function EncodeToTOON() {
  const [input, setInput] = useState("");
  const [format, setFormat] = useState<InputFormat>("auto");

  const handleSubmit = async (values: { input: string; format: InputFormat }) => {
    if (!values.input || values.input.trim().length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Input cannot be empty",
      });
      return;
    }

    try {
      const result = encodeToTOON(values.input, values.format);

      if (!result.success) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Encoding Failed",
          message: result.error || "Unknown error",
        });
        return;
      }

      // Copy to clipboard
      await Clipboard.copy(result.toon);

      // Calculate token savings
      const savings = calculateTokenSavings(result.original, result.toon);

      // Save to recent
      await saveRecent(result.toon, result.original, result.format);

      await showToast({
        style: Toast.Style.Success,
        title: "Encoded to TOON",
        message: `Copied to clipboard${savings > 0 ? ` • ${savings}% smaller` : ""}`,
      });

      // Clear input
      setInput("");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Clipboard} title="Encode & Copy to Clipboard" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="JSON or YAML"
        placeholder='Paste your JSON or YAML here...\n\nExample JSON:\n{"name": "John", "age": 30}\n\nExample YAML:\nname: John\nage: 30'
        value={input}
        onChange={setInput}
        autoFocus
      />
      <Form.Dropdown
        id="format"
        title="Format"
        value={format}
        onChange={(newValue) => setFormat(newValue as InputFormat)}
      >
        <Form.Dropdown.Item value="auto" title="Auto-detect" />
        <Form.Dropdown.Item value="json" title="JSON" />
        <Form.Dropdown.Item value="yaml" title="YAML" />
      </Form.Dropdown>
    </Form>
  );
}
