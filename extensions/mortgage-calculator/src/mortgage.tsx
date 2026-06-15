import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, useNavigation, Detail } from "@raycast/api";
import { useState } from "react";
import { calculateMortgage, MortgageLocation, MortgageResult } from "./utils/mortgage";

interface Preferences {
  location: MortgageLocation;
}

interface FormValues {
  propertyValue: string;
  downPayment: string;
  downPaymentType: "percent" | "amount";
  interestRate: string;
  loanTermYears: string;
  isInterestOnly: boolean;
}

function ResultsView({
  result,
  values,
  dpAmount,
  location,
}: {
  result: MortgageResult;
  values: FormValues;
  dpAmount: number;
  location: string;
}) {
  const propValFormatted = parseFloat(values.propertyValue).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const dpAmountFormatted = dpAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const principalFormatted = result.principal.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const monthlyPaymentFormatted = result.monthlyPayment.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const totalInterestFormatted = result.totalInterest.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const totalCostFormatted = result.totalCost.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const markdown = `
# Monthly Payment: $${monthlyPaymentFormatted}

**Total Interest Paid:** $${totalInterestFormatted}  
**Total Cost of Loan:** $${totalCostFormatted}

---
*Note: This is an estimate for principal and interest only. It does not include property taxes, home insurance, HOA fees, or Private Mortgage Insurance (PMI).*
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Location Rules Applied" text={location} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Property Value" text={`$${propValFormatted}`} />
          <Detail.Metadata.Label title="Down Payment" text={`$${dpAmountFormatted}`} />
          <Detail.Metadata.Label title="Principal (Loan Amount)" text={`$${principalFormatted}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Interest Rate" text={`${values.interestRate}%`} />
          <Detail.Metadata.Label title="Loan Term" text={`${values.loanTermYears} years`} />
          <Detail.Metadata.Label title="Type" text={values.isInterestOnly ? "Interest-Only" : "Principal & Interest"} />
        </Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();

  const [propertyValue, setPropertyValue] = useState<string>("500000");
  const [downPayment, setDownPayment] = useState<string>("20");
  const [downPaymentType, setDownPaymentType] = useState<string>("percent");
  const [interestRate, setInterestRate] = useState<string>("5.5");
  const [loanTermYears, setLoanTermYears] = useState<string>("30");
  const [isInterestOnly, setIsInterestOnly] = useState<boolean>(false);

  // Helper to safely parse formatted numbers
  const parseNumber = (val: string) => parseFloat(val.replace(/,/g, ""));

  function handleSubmit(values: FormValues) {
    const propVal = parseNumber(values.propertyValue);
    let dpVal = parseNumber(values.downPayment);
    const rateVal = parseNumber(values.interestRate);
    const termVal = parseNumber(values.loanTermYears);

    if (isNaN(propVal) || isNaN(dpVal) || isNaN(rateVal) || isNaN(termVal)) {
      showToast({ style: Toast.Style.Failure, title: "Invalid input", message: "Please enter valid numbers" });
      return;
    }

    // Convert percentage down payment to amount
    if (values.downPaymentType === "percent") {
      dpVal = propVal * (dpVal / 100);
    }

    if (dpVal > propVal) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid down payment",
        message: "Down payment cannot be greater than property value",
      });
      return;
    }

    const result = calculateMortgage({
      propertyValue: propVal,
      downPayment: dpVal,
      interestRate: rateVal,
      loanTermYears: termVal,
      location: preferences.location,
      isInterestOnly: values.isInterestOnly,
    });

    push(<ResultsView result={result} values={values} dpAmount={dpVal} location={preferences.location} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate Mortgage" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="propertyValue"
        title="Property Value ($)"
        placeholder="500000"
        value={propertyValue}
        onChange={setPropertyValue}
      />

      <Form.Dropdown
        id="downPaymentType"
        title="Down Payment Type"
        value={downPaymentType}
        onChange={setDownPaymentType}
      >
        <Form.Dropdown.Item value="percent" title="Percentage (%)" />
        <Form.Dropdown.Item value="amount" title="Fixed Amount ($)" />
      </Form.Dropdown>

      <Form.TextField
        id="downPayment"
        title={downPaymentType === "percent" ? "Down Payment (%)" : "Down Payment ($)"}
        placeholder={downPaymentType === "percent" ? "20" : "100000"}
        value={downPayment}
        onChange={setDownPayment}
      />

      <Form.Separator />

      <Form.TextField
        id="interestRate"
        title="Interest Rate (%)"
        placeholder="5.5"
        value={interestRate}
        onChange={setInterestRate}
      />

      <Form.Dropdown id="loanTermYears" title="Loan Term (Years)" value={loanTermYears} onChange={setLoanTermYears}>
        <Form.Dropdown.Item value="15" title="15 Years" />
        <Form.Dropdown.Item value="20" title="20 Years" />
        <Form.Dropdown.Item value="30" title="30 Years" />
        <Form.Dropdown.Item value="40" title="40 Years" />
      </Form.Dropdown>

      <Form.Checkbox
        id="isInterestOnly"
        title="Loan Options"
        label="Interest-Only Loan"
        value={isInterestOnly}
        onChange={setIsInterestOnly}
      />

      <Form.Description
        text={`Calculation rules applied for: ${preferences.location || "US"}. Change this in Extension Preferences.`}
      />
    </Form>
  );
}
