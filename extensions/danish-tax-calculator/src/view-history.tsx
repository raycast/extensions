import { List, Icon, ActionPanel, Action, showToast, Toast, confirmAlert, Keyboard, Alert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { formatCurrency } from "./utils";
import { getCalculationHistory, deleteCalculation, deleteAllCalculations } from "./storage";

export default function ViewHistory() {
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getCalculationHistory>>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCalculationHistory()
      .then(setHistory)
      .finally(() => setIsLoading(false));
  }, []);

  const handleDelete = async (timestamp: number) => {
    try {
      await deleteCalculation(timestamp);
      setHistory(history.filter((calc) => calc.timestamp !== timestamp));
      await showToast({
        style: Toast.Style.Success,
        title: "Calculation deleted",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete" });
    }
  };

  const handleDeleteAll = async () => {
    if (
      await confirmAlert({
        title: "Delete All Calculations",
        icon: Icon.Trash,
        message: "Are you sure you want to delete all calculations? This action cannot be undone.",
        rememberUserChoice: true,
        primaryAction: {
          title: "Delete All",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await deleteAllCalculations();
        setHistory([]);
        await showToast({
          style: Toast.Style.Success,
          title: "All calculations deleted",
        });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to delete calculations" });
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <List isLoading={isLoading}>
      {history.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Calculation History"
          description="Your tax calculation history will appear here. Start by calculating a tax payment."
        />
      ) : (
        history.map((calculation) => (
          <List.Item
            key={calculation.timestamp}
            title={formatDate(calculation.timestamp)}
            subtitle={`Income: ${formatCurrency(calculation.income)}`}
            accessories={[
              { text: `Tax: ${formatCurrency(calculation.tax)}` },
              { text: `Net: ${formatCurrency(calculation.salary)}` },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Details"
                  content={`Date: ${formatDate(calculation.timestamp)}
Income: ${formatCurrency(calculation.income)}
Tax: ${formatCurrency(calculation.tax)}
Net Salary: ${formatCurrency(calculation.salary)}`}
                />
                <ActionPanel.Section>
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(calculation.timestamp)}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                  <Action
                    title="Delete All"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={handleDeleteAll}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
