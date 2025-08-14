import { getGlobalModel } from "./api";

export const formatCurrency = (amount: number) => {
  if (amount < 1) {
    return `${amount.toFixed(5)} cents`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  }).format(amount / 100);
};

export const getModelName = (modelOverride: string) => {
  if (modelOverride == "global" || modelOverride == "" || modelOverride == undefined) {
    return getGlobalModel();
  }
  return modelOverride;
};
