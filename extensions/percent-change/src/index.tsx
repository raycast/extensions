import { Form, ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { useState } from "react";

const EMPTY_MESSAGE = "Enter values to calculate";
const INVALID_MESSAGE = "Invalid input";
const ZERO_BASELINE_MESSAGE = "Starting value cannot be 0";

function formatPercentageChange(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatAbsoluteChange(value: number) {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  const fixed = value.toFixed(2);
  return fixed.endsWith(".00") ? fixed.slice(0, -3) : fixed;
}

export default function Command() {
  const [startingValue, setStartingValue] = useState("");
  const [finalValue, setFinalValue] = useState("");

  const start = Number.parseFloat(startingValue);
  const end = Number.parseFloat(finalValue);

  const hasInput = startingValue.length > 0 || finalValue.length > 0;
  const isValidInput = Number.isFinite(start) && Number.isFinite(end);
  const isValid = isValidInput && start !== 0;

  let percentageText = EMPTY_MESSAGE;
  let absoluteText = EMPTY_MESSAGE;

  if (isValid) {
    const percentageChange = ((end - start) / start) * 100;
    const absoluteChange = end - start;
    percentageText = formatPercentageChange(percentageChange);
    absoluteText = formatAbsoluteChange(absoluteChange);
  } else if (hasInput) {
    if (start === 0 && Number.isFinite(end)) {
      percentageText = ZERO_BASELINE_MESSAGE;
    } else {
      percentageText = INVALID_MESSAGE;
    }
  }

  const clearForm = () => {
    setStartingValue("");
    setFinalValue("");
  };

  return (
    <Form
      actions={
        <ActionPanel>
          {isValid && (
            <Action.CopyToClipboard
              title="Copy Percentage Change"
              icon={Icon.Clipboard}
              content={percentageText}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
          {isValid && (
            <Action.CopyToClipboard
              title="Copy Absolute Change"
              icon={Icon.Clipboard}
              content={absoluteText}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
          <Action
            title="Clear Values"
            onAction={clearForm}
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd"], key: "delete" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="before"
        title="Starting Value"
        placeholder="e.g. 100"
        value={startingValue}
        onChange={setStartingValue}
      />
      <Form.TextField
        id="after"
        title="Final Value"
        placeholder="e.g. 150"
        value={finalValue}
        onChange={setFinalValue}
      />

      <Form.Separator />

      <Form.Description title="Percentage Change" text={percentageText} />
      <Form.Description title="Absolute Change" text={absoluteText} />
    </Form>
  );
}
