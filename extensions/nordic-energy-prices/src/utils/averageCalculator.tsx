import { PriceCurrency, PriceType } from "../types/energyData";

export const averageCalculator = (data: PriceType[]) => {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i][PriceCurrency];
  }
  return sum / data.length;
};
