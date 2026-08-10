import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Transaction {
  id: string;
  amount: number;
  counterpartyName: string;
  counterpartyNickname: string | null;
  createdAt: string;
  status: string;
  kind: string;
  note: string | null;
  externalMemo: string | null;
  dashboardLink: string;
  postedAt: string | null;
}

type Input = {
  accountId?: string;
  limit?: number;
  transactionType?: string;
};

const API_BASE_URL = "https://api.mercury.com/api/v1/";
const DEFAULT_LIMIT = 1000; // Change this to your desired limit

export default async function getTransactions(input: Input = {}) {
  const { apiKey } = getPreferenceValues<Preferences>();
  const { accountId, limit = DEFAULT_LIMIT, transactionType } = input;

  try {
    const transactions: Transaction[] = [];

    if (accountId) {
      let fetched = 0;
      let offset = 0;

      while (fetched < limit) {
        const response = await fetch(
          `${API_BASE_URL}/account/${accountId}/transactions?limit=${Math.min(
            DEFAULT_LIMIT,
            limit - fetched,
          )}&offset=${offset}${transactionType ? `&kind=${transactionType}` : ""}`,
          {
            method: "GET",
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch transactions: ${response.statusText}`);
        }

        const data = (await response.json()) as { transactions: Transaction[] };
        transactions.push(...data.transactions);

        const batchSize = data.transactions.length;
        fetched += batchSize;
        offset += batchSize;

        if (batchSize < DEFAULT_LIMIT) {
          break; // Exit if fewer than limit transactions are returned
        }
      }
    }

    return transactions.slice(0, limit);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw new Error(`Error fetching transactions: ${error instanceof Error ? error.message : String(error)}`);
  }
}
