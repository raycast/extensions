import { includeVAT } from "../constants/preferences";
import { VAT } from "../types/energyData";
export function priceConverter(price: number): string {
  if (includeVAT) {
    price = price * VAT;
  }
  return price.toFixed(3).replace(".", ",");
}
