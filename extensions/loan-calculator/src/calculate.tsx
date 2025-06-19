import { useState } from "react";
import { Form, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { LoanInputs, CompoundFrequency, PaymentFrequency, COMPOUND_OPTIONS, PAYMENT_OPTIONS } from "./helpers/types";
import ResultsView from "./components/ResultsView";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const currencySymbol = preferences.currencySymbol || "$";

  const [loanAmount, setLoanAmount] = useState<string>("");
  const [loanTermYears, setLoanTermYears] = useState<string>("");
  const [loanTermMonths, setLoanTermMonths] = useState<string>("");
  const [interestRate, setInterestRate] = useState<string>("");
  const [compound, setCompound] = useState<CompoundFrequency>("monthly");
  const [payBack, setPayBack] = useState<PaymentFrequency>("monthly");

  function getInputs(): LoanInputs {
    return {
      loanAmount,
      loanTermYears,
      loanTermMonths,
      interestRate,
      compound,
      payBack,
    };
  }

  const resultsView = <ResultsView inputs={getInputs()} />;

  const Actions = (
    <ActionPanel>
      <Action.Push title="Calculate" target={resultsView} />
    </ActionPanel>
  );

  return (
    <Form navigationTitle="Loan Calculator" actions={Actions}>
      <Form.TextField
        id="loanAmount"
        title={`Loan Amount (${currencySymbol})`}
        placeholder="10000"
        value={loanAmount}
        onChange={setLoanAmount}
        info="The total amount you want to borrow"
      />

      <Form.Separator />

      <Form.TextField
        id="loanTermYears"
        title="Loan Term (Years)"
        placeholder="10"
        value={loanTermYears}
        onChange={setLoanTermYears}
        info="Number of years for the loan"
      />

      <Form.TextField
        id="loanTermMonths"
        title="Loan Term (Months)"
        placeholder="0"
        value={loanTermMonths}
        onChange={setLoanTermMonths}
        info="Additional months (will be added to years)"
      />

      <Form.Separator />

      <Form.TextField
        id="interestRate"
        title="Interest Rate (%)"
        placeholder="6"
        value={interestRate}
        onChange={setInterestRate}
        info="Annual interest rate as a percentage"
      />

      <Form.Dropdown
        id="compound"
        title="Compound Frequency"
        value={compound}
        onChange={(value) => setCompound(value as CompoundFrequency)}
        info="How often interest is compounded"
      >
        {COMPOUND_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="payBack"
        title="Payment Frequency"
        value={payBack}
        onChange={(value) => setPayBack(value as PaymentFrequency)}
        info="How often you will make payments"
      >
        {PAYMENT_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
