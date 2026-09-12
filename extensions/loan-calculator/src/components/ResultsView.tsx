import { ActionPanel, Action, List, useNavigation, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { LoanInputs, PAYMENT_OPTIONS } from "../helpers/types";
import { calculateLoan } from "../helpers/utils";

interface ResultsViewProps {
  inputs: LoanInputs;
}

export default function ResultsView({ inputs }: ResultsViewProps) {
  const { pop } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const currencySymbol = preferences.currencySymbol || "$";

  const processedInputs: LoanInputs = {
    loanAmount: inputs.loanAmount || "10000",
    loanTermYears: inputs.loanTermYears || "10",
    loanTermMonths: inputs.loanTermMonths || "0",
    interestRate: inputs.interestRate || "6",
    compound: inputs.compound || "monthly",
    payBack: inputs.payBack || "monthly",
  };

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return `${currencySymbol}${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  try {
    const result = calculateLoan(processedInputs);
    const paymentFreqText = PAYMENT_OPTIONS.find((opt) => opt.value === processedInputs.payBack)?.title || "Monthly";

    return (
      <List navigationTitle="Loan Calculation Results">
        <List.Section title="Overview">
          <List.Item title="Total Payments" subtitle={formatCurrency(result.totalPayments)} icon="💰" />
          <List.Item
            title="Total Interest"
            subtitle={`${formatCurrency(result.totalInterest)} (${((result.totalInterest / result.totalPayments) * 100).toFixed(1)}% of total)`}
            icon="📈"
          />
          <List.Item
            title={`${paymentFreqText.replace("Every ", "")} Payment`}
            subtitle={formatCurrency(result.paymentAmount)}
            icon="💳"
          />
        </List.Section>

        <List.Section title={`Payment Schedule (${paymentFreqText})`}>
          {result.schedule.map((payment, index) => (
            <List.Item
              key={index}
              title={`Payment ${payment.period}`}
              subtitle={formatCurrency(payment.payment)}
              accessories={[
                {
                  text: `Principal: ${formatCurrency(payment.principal)}`,
                },
                {
                  text: `Interest: ${formatCurrency(payment.interest)}`,
                },
                {
                  text: `Balance: ${formatCurrency(payment.balance)}`,
                },
              ]}
              icon="📅"
            />
          ))}
        </List.Section>
      </List>
    );
  } catch {
    showFailureToast(new Error("Calculation failed"), { title: "Calculation Error" });

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
