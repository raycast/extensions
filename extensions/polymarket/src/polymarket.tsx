import { updateCommandMetadata } from "@raycast/api";
import fetch from "node-fetch";

interface MarketData {
  data: [
    {
      tokens: [
        {
          price: number;
        },
      ];
    },
  ];
}

async function fetchStats() {
  const stats: string[] = [];

  const trumpResponse = await fetch(
    "https://clob.polymarket.com/rewards/markets/0xdd22472e552920b8438158ea7238bfadfa4f736aa4cee91a6b86c39ead110917",
  );
  if (!trumpResponse.ok) {
    throw Error(`Failed fetching stats (${trumpResponse.statusText} - ${trumpResponse.status})`);
  }
  const trumpData = (await trumpResponse.json()) as MarketData;

  const harrisResponse = await fetch(
    "https://clob.polymarket.com/rewards/markets/0xc6485bb7ea46d7bb89beb9c91e7572ecfc72a6273789496f78bc5e989e4d1638",
  );
  if (!harrisResponse.ok) {
    throw Error(`Failed fetching stats (${harrisResponse.statusText} - ${harrisResponse.status})`);
  }
  const harrisData = (await harrisResponse.json()) as MarketData;

  const trump = trumpData.data[0].tokens[0].price * 100;
  const harris = harrisData.data[0].tokens[0].price * 100;

  stats.push(trump.toFixed(2), harris.toFixed(2));

  return stats;
}

function formatCommandSubtitle(jsonStats: string[]): string {
  return `Trump ${jsonStats[0]}% | Harris: ${jsonStats[1]}%`;
}

export default async function command(): Promise<void> {
  const jsonStats = await fetchStats();
  const subtitle = formatCommandSubtitle(jsonStats);

  await updateCommandMetadata({ subtitle });
}
