import { ActionPanel, Action, List, showToast, Toast, useNavigation } from "@raycast/api";
import { LoanInputs, PAYMENT_OPTIONS } from "../helpers/types";
import { calculateLoan } from "../helpers/utils";

interface ResultsViewProps {
  inputs: LoanInputs;
}

export default function ResultsView({ inputs }: ResultsViewProps) {
  const { pop } = useNavigation();

  const processedInputs: LoanInputs = {
    loanAmount: inputs.loanAmount || "10000",
    loanTermYears: inputs.loanTermYears || "10",
    loanTermMonths: inputs.loanTermMonths || "0",
    interestRate: inputs.interestRate || "6",
    compound: inputs.compound || "monthly",
    payBack: inputs.payBack || "monthly",
  };

  try {
    const result = calculateLoan(processedInputs);
    const paymentFreqText = PAYMENT_OPTIONS.find((opt) => opt.value === processedInputs.payBack)?.title || "Monthly";

    return (
      <List navigationTitle="Loan Calculation Results">
        <List.Section title="Overview">
          <List.Item
            title="Total Payments"
            subtitle={`$${result.totalPayments.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon="💰"
          />
          <List.Item
            title="Total Interest"
            subtitle={`$${result.totalInterest.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${((result.totalInterest / result.totalPayments) * 100).toFixed(1)}% of total)`}
            icon="📈"
          />
          <List.Item
            title={`${paymentFreqText.replace("Every ", "")} Payment`}
            subtitle={`$${result.monthlyPayment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon="💳"
          />
        </List.Section>

        <List.Section title={`Payment Schedule (${paymentFreqText})`}>
          {result.schedule.map((payment, index) => (
            <List.Item
              key={index}
              title={`Payment ${payment.period}`}
              subtitle={`$${payment.payment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              accessories={[
                {
                  text: `Principal: $${payment.principal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                },
                {
                  text: `Interest: $${payment.interest.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                },
                {
                  text: `Balance: $${payment.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                },
              ]}
              icon="📅"
            />
          ))}
        </List.Section>
      </List>
    );
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: "Calculation Error",
      message: "Please check your input values",
    });

    return (
      <List navigationTitle="Error">
        <List.Item
          title="Calculation Error"
          subtitle="Please check your input values and try again"
          icon="❌"
          actions={
            <ActionPanel>
              <Action title="Go Back" onAction={pop} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
}
