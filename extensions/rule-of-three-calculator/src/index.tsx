import { Form, ActionPanel, Action, showToast, Detail } from "@raycast/api";
import { useState } from "react";

type Values = {
  valueA: string;
  valueB: string;
  valueC: string;
  valueD: string;
};

function calculate(values: Values) {
  const { valueA, valueB, valueC, valueD } = values;
  const nums = [valueA, valueB, valueC, valueD].map((v) => (v === "" ? null : parseFloat(v)));

  const nullIndex = nums.indexOf(null);
  if (nums.filter((n) => n === null).length !== 1) {
    return null; // Ensure exactly one value is null
  }

  const [numA, numB, numC, numD] = nums;

  switch (nullIndex) {
    case 0:
      return numD !== 0 ? (numB! * numC!) / numD! : NaN;
    case 1:
      return numC !== 0 ? (numA! * numD!) / numC! : NaN;
    case 2:
      return numB !== 0 ? (numA! * numD!) / numB! : NaN;
    case 3:
      return numA !== 0 ? (numC! * numB!) / numA! : NaN;
    default:
      return null;
  }
}

function ResultView({ values, onBack }: { values: Values; onBack: () => void }) {
  const calculatedValue = calculate(values);
  const result = calculatedValue !== null && !isNaN(calculatedValue) ? `X = ${calculatedValue}` : "Calculation Error";

  const formattedA = values.valueA || "X";
  const formattedB = values.valueB || "X";
  const formattedC = values.valueC || "X";
  const formattedD = values.valueD || "X";

  const markdown = `

\`\`\`


  ${formattedA.padStart(10, " ")} -> ${formattedB.padEnd(10, " ")}
  ${formattedC.padStart(10, " ")} -> ${formattedD.padEnd(10, " ")}


\`\`\`

## ${result}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result to Clipboard" content={result} />
          <Action title="Back" onAction={onBack} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [values, setValues] = useState<Values>({ valueA: "", valueB: "", valueC: "", valueD: "" });
  const [showResult, setShowResult] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string | undefined }>({});

  const validateInput = (input: string) => {
    if (input === "") return true;
    const validFormat = /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(input);
    return validFormat && isFinite(parseFloat(input));
  };

  const handleValueChange = (key: keyof Values) => (newValue: string) => {
    setValues((prev) => ({ ...prev, [key]: newValue }));
    const isValid = validateInput(newValue);
    setValidationErrors((prev) => ({ ...prev, [key]: isValid ? undefined : "Invalid input" }));
  };

  const generateDescription = () => {
    const { valueA, valueB, valueC, valueD } = values;
    let formattedA = valueA || "A";
    let formattedB = valueB || "B";
    let formattedC = valueC || "C";
    let formattedD = valueD || "D";

    const filledCount = [valueA, valueB, valueC, valueD].filter((v) => v !== "").length;
    if (filledCount === 3) {
      if (valueA === "") formattedA = "X";
      if (valueB === "") formattedB = "X";
      if (valueC === "") formattedC = "X";
      if (valueD === "") formattedD = "X";
    }

    return `Enter exactly 3 of the 4 possible values:\n\n${formattedA} -> ${formattedB}\n${formattedC} -> ${formattedD}`;
  };

  const handleSubmit = () => {
    const errors: { [key: string]: string | undefined } = {};
    let isValid = true;

    for (const [key, value] of Object.entries(values)) {
      if (!validateInput(value)) {
        errors[key] = "Invalid input";
        isValid = false;
      }
    }

    const filledCount = Object.values(values).filter((value) => value !== "").length;
    if (filledCount !== 3) {
      showToast({ title: "Invalid input", message: "Please leave exactly one field empty" });
      isValid = false;
    }

    setValidationErrors(errors);
    if (!isValid) {
      return;
    }

    setShowResult(true);
  };

  const emptyFieldKey = Object.keys(values).find((key) => values[key as keyof Values] === "");

  return showResult ? (
    <ResultView values={values} onBack={() => setShowResult(false)} />
  ) : (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={generateDescription()} />
      {(["valueA", "valueB", "valueC", "valueD"] as (keyof Values)[]).map((key) => {
        const filledCount = Object.values(values).filter((v) => v !== "").length;
        if (emptyFieldKey === key && filledCount === 3) {
          return (
            <Form.Description
              key={`${key}-desc`}
              text={`Let's calculate Value ${key.charAt(key.length - 1).toUpperCase()}`}
              title="X"
            />
          );
        }
        return (
          <Form.TextField
            key={key}
            id={key}
            title={`Value ${key.charAt(key.length - 1).toUpperCase()}`}
            placeholder={`Enter the ${key.charAt(key.length - 1).toUpperCase()} value`}
            value={values[key]}
            onChange={handleValueChange(key)}
            error={validationErrors[key]}
          />
        );
      })}
    </Form>
  );
}
