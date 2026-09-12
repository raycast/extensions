import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Account {
  id: string;
  name: string;
  nickname: string | null;
  currentBalance: number;
  availableBalance: number;
  kind: string;
  status: string;
  accountNumber: string;
  routingNumber: string;
  type: string;
  createdAt: string;
  legalBusinessName: string;
}

const API_BASE_URL = "https://api.mercury.com/api/v1/";

/**
 * Retrieves all Mercury accounts and their balances.
 * Returns detailed information about each account including balances, status, and account numbers.
 */
export default async function () {
  const { apiKey } = getPreferenceValues<Preferences>();

  try {
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch accounts: ${response.statusText}`);
    }

    const data = (await response.json()) as { accounts: Account[] };
    return data.accounts;
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw new Error(`Error fetching accounts: ${error instanceof Error ? error.message : String(error)}`);
  }
}
