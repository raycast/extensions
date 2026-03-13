import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useForm } from "@raycast/utils";

type Values = {
  calculationType: string;
  principal: string;
  rate: string;
  compoundFrequency: string;
  time: string;
};

const numberValidation = (value: string | undefined): string | undefined => {
  if (!value) return "This field is required";
  const normalizedValue = value.replace(",", ".");
  if (Number.isNaN(Number(normalizedValue))) {
    return "Please enter a valid number";
  }
  return undefined;
};

export default function Command() {
  const [result, setResult] = useState<string | null>(null);
  const { handleSubmit, itemProps, values } = useForm<Values>({
    onSubmit: (values: Values) => calculateYield(values),
    initialValues: { calculationType: "apr", compoundFrequency: "12" },
    validation: {
      principal: numberValidation,
      rate: numberValidation,
      time: numberValidation,
    },
  });

  function calculateYield(values: Values) {
    const principal = Number(values.principal.replace(",", "."));
    const rate = Number(values.rate.replace(",", ".")) / 100;
    const time = Number(values.time.replace(",", "."));
    const compoundFrequency = Number(values.compoundFrequency);

    let yieldResult: number;

    if (values.calculationType === "apy") {
      // APY calculation
      yieldResult = principal * (1 + rate / compoundFrequency) ** (compoundFrequency * time) - principal;
    } else {
      // APR calculation
      yieldResult = principal * rate * time;
    }

    const formattedResult = yieldResult.toFixed(2);
    setResult(formattedResult);
    showToast({ title: "Calculation complete", message: `Result: $${formattedResult}`, style: Toast.Style.Success });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Calculate APY (with compound) or APR" />
      <Form.Dropdown {...itemProps.calculationType} title="Calculation Type">
        <Form.Dropdown.Item value="apr" title="APR (Simple Interest)" />
        <Form.Dropdown.Item value="apy" title="APY (Compound Interest)" />
      </Form.Dropdown>
      <Form.TextField {...itemProps.principal} title="Principal Amount" placeholder="Enter principal amount" />
      <Form.TextField {...itemProps.rate} title="Interest Rate (%)" placeholder="Enter annual interest rate" />
      {values.calculationType === "apy" && (
        <Form.Dropdown {...itemProps.compoundFrequency} title="Compound Frequency">
          <Form.Dropdown.Item value="1" title="Annually" />
          <Form.Dropdown.Item value="2" title="Semi-annually" />
          <Form.Dropdown.Item value="4" title="Quarterly" />
          <Form.Dropdown.Item value="12" title="Monthly" />
          <Form.Dropdown.Item value="365" title="Daily" />
        </Form.Dropdown>
      )}
      <Form.TextField {...itemProps.time} title="Time (years)" placeholder="Enter time in years" />
      {result && <Form.Description text={`Calculated Yield: $${result}`} />}
    </Form>
  );
}
