// import { Cache } from "@raycast/api";
import { Transaction, TransactionsResponse } from "./types";
import fetch from "node-fetch";
import { network_configs } from "./networkConfig";
// import Parser from "rss-parser";
// import { CacheEntry, Topic } from "./types";

// The HNRSS service caches responses for 5 minutes: https://github.com/hnrss/hnrss/issues/71
// const CACHE_DURATION_IN_MS = 5 * 60 * 1_000;

// const cache = new Cache();

export function validateHash(hash: string) {
  return hash.length === 66 && hash.startsWith("0x");
}

export async function getTransactions(hash: string): Promise<TransactionsResponse> {
  try {
    if (!validateHash(hash)) {
      return { transactions: [] };
    }

    const response = await fetch(`https://api.tenderly.co/api/v1/search?query=${hash}`);
    const transactions: TransactionsResponse = (await response.json()) as TransactionsResponse;
    if ("transactions" in transactions) {
      // Property "transactions" exists in the "transactions" object
      // Add your code here
      return transactions;
    } else {
      // Property "transactions" does not exist in the "transactions" object
      // Add your code here
      return { transactions: [] };
    }
  } catch (error) {
    console.error("Failed to fetch transactions", error);
    throw error;
  }
}
export function openInTenderly(transaction: Transaction) {
  const network = network_configs[transaction.network_id];
  return `https://dashboard.tenderly.co/tx/${network.slug ?? network.networkName.toLowerCase().replace(" ", "-")}/${transaction.hash}`;
}
// export const gqlFetcher = async (url: string, query: string, variables: any) => {
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ query, variables }),
//     });
//     const json = await response.json();
//     return json.data;
// };
// export const getTransactionFromExplorer = async (hash: string): Promise<{ findNitroTransactionByFilter: NitroTransactionReceipt }> => {
//     const txnQuery = `query($hash:String!) {
//       findNitroTransactionByFilter(hash: $hash){
//       dest_timestamp
//       src_timestamp
//       src_tx_hash
//       dest_tx_hash
//       status
//       dest_address
//       dest_amount
//       dest_symbol
//       fee_amount
//       fee_address
//       fee_symbol
//       recipient_address
//       deposit_id
//       src_amount
//       dest_amount
//       src_stable_address
//   }}`;
//     const txn = await gqlFetcher(VOYAGER_EXPLORER_API_HOST, txnQuery, { hash });
//     return txn;
// };

// const VOYAGER_EXPLORER_API_HOST = "https://api.pro-nitro-explorer-public.routernitro.com/graphql";
