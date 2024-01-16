import { Form, ActionPanel, Action, showToast, Clipboard, openExtensionPreferences } from "@raycast/api";
import { useState } from "react";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  decimalPlaces: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [firstNumberError, setFirstNumberError] = useState<string | undefined>();
  const [secondNumberError, setSecondNumberError] = useState<string | undefined>();

  function dropFirstNumberErrorIfNeeded() {
    if (firstNumberError) {
      setFirstNumberError(undefined);
    }
  }

  function dropSecondNumberErrorIfNeeded() {
    if (secondNumberError) {
      setSecondNumberError(undefined);
    }
  }

  function validateNumber(value: string): boolean {
    return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
  }

  async function handleSubmit(values: { firstNumber: string; secondNumber: string }) {
    const isValidFirstNumber = validateNumber(values.firstNumber);
    const isValidSecondNumber = validateNumber(values.secondNumber);

    if (!isValidFirstNumber || !isValidSecondNumber) {
      if (!isValidFirstNumber) {
        setFirstNumberError("Please enter a valid number");
      }
      if (!isValidSecondNumber) {
        setSecondNumberError("Please enter a valid number");
      }
      return;
    }

    const oldValue = parseFloat(values.firstNumber);
    const newValue = parseFloat(values.secondNumber);

    let decimalPlaces = parseInt(preferences.decimalPlaces);

    // Validate decimalPlaces to be within the range 0-20
    if (isNaN(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 20) {
      decimalPlaces = 2; // Set a sensible default
    }

    const percentageChange = ((newValue - oldValue) / oldValue) * 100;
    const formattedResult = new Intl.NumberFormat("en-US", {
      style: "decimal",
      maximumFractionDigits: decimalPlaces,
    }).format(percentageChange);
    const resultText = `${formattedResult}%`;

    await Clipboard.copy(resultText);
    showToast({ title: "Copied", message: "The percentage change is: " + resultText });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate and Copy" onSubmit={handleSubmit} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter two numbers to calculate the percentage change and copy it to the clipboard." />
      <Form.TextField
        id="firstNumber"
        autoFocus={true}
        title="Old Value"
        placeholder="Enter old value"
        defaultValue=""
        error={firstNumberError}
        onChange={(newValue) => {
          if (newValue !== undefined && validateNumber(newValue)) {
            dropFirstNumberErrorIfNeeded();
          } else {
            setFirstNumberError("Please enter a valid number");
          }
        }}
        onBlur={(event) => {
          const value = event.target.value;
          if (value !== undefined && !validateNumber(value)) {
            setFirstNumberError("Please enter a valid number");
          } else {
            dropFirstNumberErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="secondNumber"
        title="New Value"
        placeholder="Enter new value"
        defaultValue=""
        error={secondNumberError}
        onChange={(newValue) => {
          if (newValue !== undefined && validateNumber(newValue)) {
            dropSecondNumberErrorIfNeeded();
          } else {
            setSecondNumberError("Please enter a valid number");
          }
        }}
        onBlur={(event) => {
          const value = event.target.value;
          if (value !== undefined && !validateNumber(value)) {
            setSecondNumberError("Please enter a valid number");
          } else {
            dropSecondNumberErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
}
