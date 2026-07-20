import { Color, Icon, LaunchProps, List, getPreferenceValues, ActionPanel, showToast, Toast } from "@raycast/api";
import { calculatePayment } from "./functions";
import { Actions, AM_CONTRIBUTION_PERCENTAGE } from "./constants";
import { TaxCalculation } from "./types";
import { saveCalculation } from "./storage";
import { formatCurrency } from "./utils";

export default function Command(props: LaunchProps<{ arguments: Arguments.CalculatePayment }>) {
  const { income, deduction, drawPercentage } = props.arguments;
  const { defaultPercentage } = getPreferenceValues<ExtensionPreferences>();

  try {
    const calculation: TaxCalculation = calculatePayment(
      income,
      deduction,
      drawPercentage || "",
      defaultPercentage || "",
    );

    const { incomeValue, am, taxableIncome, tax, salary, argPercentage } = calculation;

    // Save calculation to history
    saveCalculation({
      timestamp: Date.now(),
      income: incomeValue,
      tax,
      salary,
    }).catch((error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save calculation",
        message: String(error),
      });
    });

    return (
      <List filtering={false}>
        <List.Item
          title="Income"
          icon={Icon.Receipt}
          subtitle={income.includes("*") ? income : undefined}
          accessories={[{ tag: { value: formatCurrency(incomeValue), color: Color.Green } }]}
          actions={<Actions content={formatCurrency(incomeValue)} />}
        />
        <List.Item
          title="AM Contribution"
          icon={Icon.Coin}
          subtitle={`${AM_CONTRIBUTION_PERCENTAGE}% of ${formatCurrency(incomeValue)}`}
          accessories={[{ tag: { value: `-${formatCurrency(am)}`, color: Color.Red } }]}
          actions={<Actions content={`-${formatCurrency(am)}`} />}
        />
        <List.Item
          title="Tax"
          icon={Icon.Coins}
          subtitle={`${argPercentage}% of ${formatCurrency(taxableIncome)}`}
          accessories={[{ tag: { value: `-${formatCurrency(tax)}`, color: Color.Red } }]}
          actions={<Actions content={`-${formatCurrency(tax)}`} />}
        />
        <List.Item
          title="Salary"
          icon={Icon.BankNote}
          accessories={[{ tag: { value: formatCurrency(salary), color: Color.Green } }]}
          actions={
            <ActionPanel>
              <Actions content={formatCurrency(salary)} />
            </ActionPanel>
          }
        />
      </List>
    );
  } catch (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Invalid Input"
          description={error instanceof Error ? error.message : "Unknown error occurred"}
        />
      </List>
    );
  }
}
