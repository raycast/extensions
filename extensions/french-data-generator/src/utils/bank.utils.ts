import { bankDetails } from "../data/bank";

export function getRandomBankDetails() {
  const randomIndex = Math.floor(Math.random() * bankDetails.length);
  return bankDetails[randomIndex];
}
