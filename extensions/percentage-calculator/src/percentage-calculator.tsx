import { ActionPanel, Action, showToast, Toast, Clipboard, List, Color, Icon, LaunchProps } from "@raycast/api";
import { useState, useEffect } from "react";

interface Arguments {
  value1: string;
  value2: string;
}

interface CalculationResult {
  title: string;
  value: string;
  subtitle: string;
  icon: Icon;
  color: Color;
}

export default function PercentageCalculator({ arguments: args }: LaunchProps<{ arguments: Arguments }>) {
  const [results, setResults] = useState<CalculationResult[]>([]);

  // Calculate immediately when component mounts
  useEffect(() => {
    performCalculation(args);
  }, []);

  const calculateBasicPercentage = (percent: number, value: number): number => {
    return (percent / 100) * value;
  };

  const calculatePercentageOf = (part: number, whole: number): number => {
    return (part / whole) * 100;
  };

  const calculatePercentageDifference = (value1: number, value2: number): number => {
    return Math.abs((value1 - value2) / ((value1 + value2) / 2)) * 100;
  };

  const calculatePercentageChange = (oldValue: number, newValue: number): number => {
    return ((newValue - oldValue) / oldValue) * 100;
  };

  const performCalculation = (args: Arguments) => {
    try {
      const value1 = parseFloat(args.value1);
      const value2 = parseFloat(args.value2);

      if (isNaN(value1) || isNaN(value2)) {
        throw new Error("Invalid numbers");
      }

      const calculationResults: CalculationResult[] = [];

      // Basic percentage calculations
      calculationResults.push({
        title: `${value1}% of ${value2}`,
        value: calculateBasicPercentage(value1, value2).toFixed(2),
        subtitle: "Basic Percentage",
        icon: Icon.Calculator,
        color: Color.Blue,
      });

      calculationResults.push({
        title: `${value2}% of ${value1}`,
        value: calculateBasicPercentage(value2, value1).toFixed(2),
        subtitle: "Basic Percentage",
        icon: Icon.Calculator,
        color: Color.Blue,
      });

      // What percentage calculations
      calculationResults.push({
        title: `${value1} is what % of ${value2}`,
        value: `${calculatePercentageOf(value1, value2).toFixed(2)}%`,
        subtitle: "Percentage Ratio",
        icon: Icon.ArrowRight,
        color: Color.Green,
      });

      calculationResults.push({
        title: `${value2} is what % of ${value1}`,
        value: `${calculatePercentageOf(value2, value1).toFixed(2)}%`,
        subtitle: "Percentage Ratio",
        icon: Icon.ArrowRight,
        color: Color.Green,
      });

      // Percentage difference
      calculationResults.push({
        title: "Percentage Difference",
        value: `${calculatePercentageDifference(value1, value2).toFixed(2)}%`,
        subtitle: `Between ${value1} and ${value2}`,
        icon: Icon.TwoArrowsClockwise,
        color: Color.Orange,
      });

      // Percentage changes
      const change1to2 = calculatePercentageChange(value1, value2);
      const change2to1 = calculatePercentageChange(value2, value1);
      const direction1to2 = change1to2 >= 0 ? "increase" : "decrease";
      const direction2to1 = change2to1 >= 0 ? "increase" : "decrease";

      calculationResults.push({
        title: `From ${value1} to ${value2}`,
        value: `${Math.abs(change1to2).toFixed(2)}% ${direction1to2}`,
        subtitle: "Percentage Change",
        icon: change1to2 >= 0 ? Icon.ArrowUp : Icon.ArrowDown,
        color: change1to2 >= 0 ? Color.Green : Color.Red,
      });

      calculationResults.push({
        title: `From ${value2} to ${value1}`,
        value: `${Math.abs(change2to1).toFixed(2)}% ${direction2to1}`,
        subtitle: "Percentage Change",
        icon: change2to1 >= 0 ? Icon.ArrowUp : Icon.ArrowDown,
        color: change2to1 >= 0 ? Color.Green : Color.Red,
      });

      setResults(calculationResults);

      showToast({
        style: Toast.Style.Success,
        title: "Calculated",
        message: "Full stats calculated",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter valid numbers",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.copy(text);
    showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
      message: text,
    });
  };

  const copyAllResults = () => {
    const allResults = results.map((result) => `${result.title}: ${result.value}`).join("\n");
    copyToClipboard(allResults);
  };

  return (
    <List
      actions={
        <ActionPanel>
          <Action title="Copy All Results" onAction={copyAllResults} />
        </ActionPanel>
      }
    >
      {results.map((result, index) => (
        <List.Item
          key={index}
          title={result.title}
          subtitle={result.subtitle}
          accessoryTitle={result.value}
          icon={{ source: result.icon, tintColor: result.color }}
          actions={
            <ActionPanel>
              <Action title="Copy Result" onAction={() => copyToClipboard(result.value)} />
              <Action title="Copy Full Text" onAction={() => copyToClipboard(`${result.title}: ${result.value}`)} />
              <Action title="Copy All Results" onAction={copyAllResults} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
