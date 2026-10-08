import { Action, ActionPanel, Detail } from "@raycast/api";
import { CalculationResult } from "../types";

export function ResultDetail({ result }: { result: CalculationResult }) {
  const markdown = `
# Calculation Report

## Reference Data

Price index: ${result.priceIndex}  
Start date: ${result.startDate}  
End date: ${result.endDate}  
Original value: ${result.originalValue}  

## Index Variation in the Period

In percentage: ${result.percentageChange}  
In adjustment factor: ${result.adjustmentFactor}  

The index values used in the calculation were:
${result.data.map((item) => `${item.data} = ${item.valor}%`).join("; ")}  

## Final Calculation

Updated Value = Original Value * Factor = ${result.originalValue} * ${result.adjustmentFactor}  
Updated Value = ${result.updatedValue}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Updated Value" content={result.updatedValue} />
          <Action.CopyToClipboard title="Copy Adjustment Factor" content={result.adjustmentFactor} />
          <Action.CopyToClipboard title="Copy Calculation Report" content={markdown} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Original Value" text={result.originalValue} />
          <Detail.Metadata.Label title="Updated Value" text={result.updatedValue} />
          <Detail.Metadata.Label title="Start Date" text={result.startDate} />
          <Detail.Metadata.Label title="End Date" text={result.endDate} />
          <Detail.Metadata.Label title="Price Index" text={result.priceIndex} />
          <Detail.Metadata.Label title="Percentage Change" text={result.percentageChange} />
          <Detail.Metadata.Label title="Adjustment Factor" text={result.adjustmentFactor} />
        </Detail.Metadata>
      }
    />
  );
}
