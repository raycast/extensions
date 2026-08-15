import { getGlobalModel } from "./api";

export const formatCurrency = (amount: number) => {
  if (amount < 1) {
    return `${amount.toFixed(5)} cents`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD", // OpenRouter uses USD only
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  }).format(amount);
};

export const getModelName = (modelOverride: string) => {
  if (modelOverride === "global" || modelOverride === "" || modelOverride === undefined) {
    return getGlobalModel();
  }
  return modelOverride;
};

export const formatAPIError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("404") && message.includes("No endpoints found")) {
    const match = message.match(/No endpoints found for (.+)\./);
    const modelId = match ? match[1] : "the selected model";
    return `Model "${modelId}" not found on OpenRouter. Check your model settings in Raycast preferences.`;
  }
  if (message.includes("405")) {
    return `Provider rejected the request (405). Try a different provider sort or model.`;
  }
  return message;
};
