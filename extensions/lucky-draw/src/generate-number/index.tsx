import { Action, ActionPanel, Detail, Form, Toast, showToast } from "@raycast/api";
import { useState } from "react";

import { parseInclusiveRange } from "../shared";
import generateNumber, { formatGenerateNumberMarkdown } from "./generate-number";
import type { GenerateNumberFormValues } from "./types";

// View for the generated number result.
function GenerateNumberResult({
  onChangeSettings,
  onGenerateAgain,
  value,
}: {
  onChangeSettings: () => void;
  onGenerateAgain: () => void;
  value: number;
}) {
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action
            key="return"
            onAction={onGenerateAgain}
            shortcut={{ key: "return", modifiers: [] }}
            title="Generate Again"
          />
          <Action title="Change Settings" onAction={onChangeSettings} />
        </ActionPanel>
      }
      markdown={formatGenerateNumberMarkdown(value)}
    />
  );
}

// Main command for generating a number.
export default function GenerateNumberCommand() {
  const [defaultValues, setDefaultValues] = useState<GenerateNumberFormValues>({ max: "10", min: "1" });
  const [value, setValue] = useState<number | null>(null);

  /**
   * Handle the generation of a number from the submitted range.
   */
  async function handleSubmit(values: GenerateNumberFormValues) {
    try {
      const range = parseInclusiveRange(values.min, values.max);
      setDefaultValues(values);
      setValue(generateNumber(range));
    } catch (error) {
      await showToast({
        message: error instanceof Error ? error.message : "Unable to generate a number.",
        style: Toast.Style.Failure,
        title: "Invalid range",
      });
    }
  }

  /**
   * Handle generating another number with the current range.
   */
  function handleGenerateAgain() {
    const range = parseInclusiveRange(defaultValues.min, defaultValues.max);
    setValue(generateNumber(range));
  }

  /**
   * Render the generated number result.
   */
  if (value !== null) {
    return (
      <GenerateNumberResult
        onChangeSettings={() => setValue(null)}
        onGenerateAgain={handleGenerateAgain}
        value={value}
      />
    );
  }

  /**
   * Render the range form.
   */
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={handleSubmit}
            shortcut={{ key: "return", modifiers: [] }}
            title="Generate Number"
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        defaultValue={defaultValues.min}
        id="min"
        placeholder="e.g. 1"
        title="Minimum"
        autoFocus={false}
      />
      <Form.TextField
        defaultValue={defaultValues.max}
        id="max"
        placeholder="e.g. 10"
        title="Maximum"
        autoFocus={false}
      />
    </Form>
  );
}
