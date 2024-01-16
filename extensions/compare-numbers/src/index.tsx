import { Form, ActionPanel, Action, showToast, Clipboard } from "@raycast/api";
import { useState } from "react";

// Define a type for the form values
type Values = {
  firstNumber: string;
  secondNumber: string;
};

export default function Command() {

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

    const percentageChange = ((newValue - oldValue) / oldValue) * 100;
    const formattedResult = new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 4 }).format(percentageChange);
    const resultText = `${formattedResult}%`;
    
    await Clipboard.copy(resultText);
    showToast({ title: "Copied", message: "The percentage change is: " + resultText });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate and Copy" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter two numbers to calculate the percentage change and copy it to the clipboard." />
      <Form.TextField
        id="firstNumber"
        title="Old Value"
        placeholder="Enter old value"
        defaultValue=""
        error={firstNumberError}
        onChange={dropFirstNumberErrorIfNeeded}
        onBlur={(event) => {
          if (!validateNumber(event.target.value)) {
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
        onChange={dropSecondNumberErrorIfNeeded}
        onBlur={(event) => {
          if (!validateNumber(event.target.value)) {
            setSecondNumberError("Please enter a valid number");
          } else {
            dropSecondNumberErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
}
