import { getPreferenceValues } from "@raycast/api";

import type { GetNetworkStatsV1StatsSummaryGetQuery } from "@sparkscan/api-types";

import { BASE_HEADERS } from "../lib/constants";
import type { Preferences } from "../lib/preferences";

interface Input {
  /**
   * The network to get the stats for.
   */
  network?: "MAINNET" | "REGTEST";
}

type Result = GetNetworkStatsV1StatsSummaryGetQuery["Response"] | GetNetworkStatsV1StatsSummaryGetQuery["Errors"];

export default async function tool(input: Input) {
  const preferences = getPreferenceValues<Preferences>();

  const network = input.network || preferences.defaultNetwork;

  const response = await fetch(
    `https://api.sparkscan.io/v1/stats/summary?${new URLSearchParams({ network: network.toUpperCase() })}`,
    {
      headers: {
        ...BASE_HEADERS,
      },
    },
  );
  if (!response.ok) {
    console.error("Failed to fetch statistics:", response.statusText);
    throw new Error(response.statusText);
  }

  const result = (await response.json()) as Result;

  if ("detail" in result) {
    console.error("Failed to fetch statistics:", result.detail);
    throw new Error("Failed to fetch statistics");
  }
  const data = result as GetNetworkStatsV1StatsSummaryGetQuery["Response"];

  return {
    network,
    totalValueLockedSats: data?.totalValueLockedSats,
    totalValueLockedUsd: data?.totalValueLockedUsd,
    activeAccounts: data?.activeAccounts,
    transactions24h: data?.transactions24h,
    currentBtcPriceUsd: data?.currentBtcPriceUsd,
  };
}
