import { SUPABASE_URL } from "./supabase";
import { getApiKey } from "./backend";

// * Types
interface CreditsResponse {
  balance: number;
  created_at: string;
  updated_at: string;
}

interface ErrorResponse {
  error: true;
  message: string;
}

// * Fetch user's current credit balance
export async function fetchCredits(): Promise<number> {
  const apiKey = getApiKey();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/get-credits`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const data = await response.json();

  if (!response.ok || (data as ErrorResponse).error) {
    throw new Error((data as ErrorResponse).message || "Failed to fetch credits");
  }

  return (data as CreditsResponse).balance;
}

// * Format credits for display
export function formatCredits(balance: number): string {
  return `${balance} credit${balance !== 1 ? "s" : ""}`;
}
