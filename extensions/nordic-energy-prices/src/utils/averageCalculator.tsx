import { PriceCurrency, PriceType } from "../types/energyData";
import { includeVAT } from "../constants/preferences";
import { VAT } from "../types/energyData";

export const averageCalculator = (data: PriceType[]) => {
  if (data.length === 0) return 0;

  const sum = data.reduce((acc, item) => (acc += item[PriceCurrency]), 0) * (includeVAT ? VAT : 1);
  return sum / data.length;
};
