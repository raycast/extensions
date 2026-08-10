import { fetchCredits as fetchCreditsFromMailFinder } from "./api/mail-finder-client";

export const fetchCredits = fetchCreditsFromMailFinder;

export function formatCredits(balance: number): string {
  return `${balance} credit${balance !== 1 ? "s" : ""}`;
}
