import { Clipboard, closeMainWindow, getSelectedText, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { calculateAdjustmentFactors } from "./services/calculations";
import { FinancialIndexData } from "./types";
import { formatDate, formatNumber } from "./utils/formatting";

export default async function Command(props: { arguments: { endDate?: string; indexName: string } }) {
  try {
    const selectedText = await getSelectedText();
    const startDates = selectedText.split(/\s+/).filter((date) => /^\d{2}\/\d{2}\/\d{4}$/.test(date));

    if (startDates.length === 0) {
      throw new Error("No valid dates found in the selected text");
    }

    await closeMainWindow();
    await showToast({
      style: Toast.Style.Animated,
      title: "Calculating adjustment factors…",
    });

    const endDate = props.arguments.endDate || formatDate(new Date());
    const indexCode = props.arguments.indexName;

    const startDate = startDates.reduce(
      (minDate, date) => (new Date(date) < new Date(minDate) ? date : minDate),
      startDates[0],
    );
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${indexCode}/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0 || !isFinancialIndexData(data)) {
      throw new Error("Invalid data received from the API");
    }

    const adjustmentFactors = calculateAdjustmentFactors(startDates, endDate, data);
    const formattedAdjustmentFactors = adjustmentFactors.map((factor) =>
      formatNumber(factor, { minimumFractionDigits: 10, maximumFractionDigits: 10 }),
    );

    await Clipboard.copy(formattedAdjustmentFactors.join("\n"));

    await showToast({
      style: Toast.Style.Success,
      title: "Adjustment factors copied to clipboard",
      message: `${adjustmentFactors.length} factors calculated`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: error instanceof Error ? error.message : String(error),
    });
  }
}

function isFinancialIndexData(data: unknown): data is FinancialIndexData[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "data" in item &&
        typeof item.data === "string" &&
        "valor" in item &&
        typeof item.valor === "string",
    )
  );
}
