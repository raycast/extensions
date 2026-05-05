import React from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { CalculationResult } from "../types";
import { formatCurrency, formatPercent } from "../utils";

interface ResultsViewProps {
  results: CalculationResult;
  currencyCode: string;
}

const ResultsView: React.FC<ResultsViewProps> = ({ results, currencyCode }) => {
  const items = [
    { title: "Mode", value: results.mode },
    { title: "Capital", value: formatCurrency(results.capital, currencyCode) },
    {
      title: "Risk Amount",
      value: formatCurrency(results.riskAmount, currencyCode),
      copyValue: results.riskAmount.toString(),
    },
    {
      title: "Entry Price",
      value: results.entry.toFixed(2),
      copyValue: results.entry.toString(),
    },
    {
      title: "Stop Loss",
      value: `${results.stopLoss.toFixed(2)} (${formatPercent(results.stopLossPercent)})`,
      copyValue: results.stopLoss.toString(),
    },
    {
      title: "Target",
      value: `${results.target.toFixed(2)} (${formatPercent(results.targetPercent)})`,
      copyValue: results.target.toString(),
    },
    {
      title: "Risk / Share",
      value: results.riskPerShare.toFixed(2),
      copyValue: results.riskPerShare.toString(),
    },
    {
      title: "Quantity (Position Size)",
      value: results.positionSize.toString(),
      copyValue: results.positionSize.toString(),
    },
    {
      title: "Investment (Exposure)",
      value: `${formatCurrency(results.investmentAmount, currencyCode)} (${formatPercent(results.exposurePercent)})`,
      copyValue: results.investmentAmount.toString(),
    },
    {
      title: "Potential Reward",
      value: formatCurrency(results.reward, currencyCode),
      copyValue: results.reward.toString(),
    },
    {
      title: "Reward/Risk Ratio",
      value: results.rewardRiskRatio.toFixed(2),
      copyValue: results.rewardRiskRatio.toString(),
    },
  ];

  return (
    <List navigationTitle="Calculation Results" isShowingDetail={false}>
      {items.map((item) => (
        <List.Item
          key={item.title}
          title={item.title}
          accessories={[{ text: item.value }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title={`Copy ${item.title}`} content={item.copyValue ?? item.value} />
              <Action.CopyToClipboard
                title="Copy All Results"
                content={items.map((i) => `${i.title}: ${i.copyValue ?? i.value}`).join("\n")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default ResultsView;
