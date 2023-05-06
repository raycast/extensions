import { updateCommandMetadata } from "@raycast/api";
import fetch from "node-fetch";

async function fetchStats() {
  const stats: string[] = [];
  let data: any = {};
  let data2: any = {};
  let data3: any = {};

  const response = await fetch("https://ultrasound.money/api/v2/fees/base-fee-per-gas");
  if (!response.ok) {
    throw Error(`Failed fetching stats (${response.statusText} - ${response.status})`);
  }
  data = await response.json();
  const gwei = data["wei"] / 1000000000;
  const gweiFixed = gwei.toFixed(0);

  const response2 = await fetch("https://ultrasound.money/api/v2/fees/eth-price-stats");
  if (!response2.ok) {
    throw Error(`Failed fetching stats (${response2.statusText} - ${response2.status})`);
  }
  data2 = await response2.json();
  const price = data2["usd"];
  const change = data2["h24Change"];
  const percentage = (change >= 0 ? "+" : "-") + (Math.abs(change) * 100).toFixed(2) + "%";

  const response3 = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?ids=bitcoin%2Cethereum&vs_currency=usd"
  );
  if (!response2.ok) {
    throw Error(`Failed fetching stats (${response2.statusText} - ${response2.status})`);
  }
  data3 = await response3.json();
  const btcPrice = data3[0]["current_price"];
  const btcMC = data3[0]["market_cap"];
  const ethPrice = data3[1]["current_price"];
  const ethMC = data3[1]["market_cap"];

  const ethBTC = ethPrice / btcPrice;
  const ethBTCFixed = ethBTC.toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  const flipPercent = (ethMC / btcMC).toLocaleString(undefined, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  stats.push(price.toString(), percentage.toString(), ethBTCFixed, flipPercent, gweiFixed.toString());

  return stats;
}

function formatCommandSubtitle(jsonStats: string[]) {
  return `    $${jsonStats[0]} (${jsonStats[1]})    ETH/BTC: ${jsonStats[2]}    🐬: ${jsonStats[3]}    ${jsonStats[4]} GWEI`;
}

export default async function command() {
  const jsonStats = await fetchStats();
  const subtitle = formatCommandSubtitle(jsonStats);

  updateCommandMetadata({ subtitle });
}
