import { ExportFormatType } from "../constants";
import { GeneratedCard } from "../generators/card";

export interface DocumentData {
  type: string;
  value: string;
  masked?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
  generatedAt: Date;
}

export function formatAsJSON(data: DocumentData[]): string {
  return JSON.stringify(data, null, 2);
}

export function formatAsCSV(data: DocumentData[]): string {
  if (data.length === 0) return "";

  const headers = ["type", "value", "masked", "generatedAt"];
  const rows = data.map((item) => [item.type, item.value, item.masked || "", item.generatedAt.toISOString()]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

  return csvContent;
}

export function formatAsText(data: DocumentData[]): string {
  return data.map((item) => item.masked || item.value).join("\n");
}

export function formatBatch(data: DocumentData[], format: ExportFormatType): string {
  switch (format) {
    case "json":
      return formatAsJSON(data);
    case "csv":
      return formatAsCSV(data);
    case "text":
      return formatAsText(data);
    default:
      return formatAsText(data);
  }
}

export function formatCardForExport(card: GeneratedCard): DocumentData {
  const masked = card.number;
  const value = card.number.replace(/\s/g, "");

  return {
    type: "card",
    value,
    masked,
    metadata: {
      brand: card.brand,
      expiry: card.expiry,
      cvv: card.cvv,
    },
    generatedAt: new Date(),
  };
}

export function formatDocumentForExport(
  type: string,
  value: string,
  masked?: string,
  metadata?: Record<string, string | number | boolean | undefined>,
): DocumentData {
  return {
    type,
    value,
    masked,
    metadata,
    generatedAt: new Date(),
  };
}
