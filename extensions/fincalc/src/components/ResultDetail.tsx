import { Action, ActionPanel, Detail } from "@raycast/api";
import { CalculationResult } from "../types";

export function ResultDetail({ result }: { result: CalculationResult }) {
  const markdown = `
# Memória de Cálculo

## Dados de Referência

Índice de atualização: ${result.priceIndex}  
Data inicial: ${result.startDate}  
Data final: ${result.endDate}  
Valor original: ${result.originalValue}  

## Variação do Índice no Período

Em percentual: ${result.percentageChange}  
Em fator de multiplicação: ${result.adjustmentFactor}  

Os valores do índice utilizados neste cálculo foram:  
${result.data.map((item) => `${item.data} = ${item.valor}%`).join("; ")}  

## Cálculo Final

Valor Atualizado = Valor Original * Fator = ${result.originalValue} * ${result.adjustmentFactor}  
Valor Atualizado = ${result.updatedValue}
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
