import { updateCommandMetadata } from "@raycast/api";
import fetch from "node-fetch";

async function fetchStats() {
  const stats: string[] = [];
  let data: any = {};
  let data2: any = {};

  const response = await fetch("https://ultrasound.money/api/v2/fees/supply-changes");
  if (!response.ok) {
    throw Error(`Failed fetching stats (${response.statusText} - ${response.status})`);
  }
  data = await response.json();

  const oneDay = Number(data["d1"]["change"]) / 1000000000000000000;
  const oneDaySupply = Number(data["d1"]["from_supply"]) / 1000000000000000000;
  const oneDayFixed = oneDay.toFixed(0);
  const oneDayPercent = (oneDay >= 0 ? "+" : "-") + (Math.abs(oneDay / oneDaySupply) * 100 * 365).toFixed(2) + "%";

  const sevenDay = Number(data["d7"]["change"]) / 1000000000000000000;
  const sevenDaySupply = Number(data["d7"]["from_supply"]) / 1000000000000000000;
  const sevenDayFixed = sevenDay.toFixed(0);
  const sevenDayPercent =
    (sevenDay >= 0 ? "+" : "-") + (Math.abs(sevenDay / sevenDaySupply) * 100 * 52).toFixed(2) + "%";

  const thirtyDay = Number(data["d30"]["change"]) / 1000000000000000000;
  const thirtyDaySupply = Number(data["d30"]["from_supply"]) / 1000000000000000000;
  const thirtyFixed = thirtyDay.toFixed(0);
  const thirtyPercent =
    (thirtyDay >= 0 ? "+" : "-") + (Math.abs(thirtyDay / thirtyDaySupply) * 100 * 12).toFixed(2) + "%";

  const response2 = await fetch("https://ultrasound.money/api/v2/fees/burn-sums");
  if (!response.ok) {
    throw Error(`Failed fetching stats (${response.statusText} - ${response.status})`);
  }
  data2 = await response2.json();
  const oneDayUSD = Number(data2["d1"]["sum"]["usd"]) / 1000000;
  const oneDayUSDFixed = oneDayUSD.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const sevenDayUSD = Number(data2["d7"]["sum"]["usd"]) / 1000000;
  const sevenDayUSDFixed = sevenDayUSD.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const thirtyDayUSD = Number(data2["d30"]["sum"]["usd"]) / 1000000;
  const thirtyDayUSDFixed = thirtyDayUSD.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  //stats.push(oneDayUSDFixed, sevenDayUSDFixed, thirtyDayUSDFixed, oneDayPercent.toString(), sevenDayPercent.toString(), thirtyPercent.toString());
  stats.push(
    oneDayUSDFixed,
    oneDayPercent.toString(),
    sevenDayUSDFixed,
    sevenDayPercent.toString(),
    thirtyDayUSDFixed,
    thirtyPercent.toString()
  );
  return stats;
}

function formatCommandSubtitle(jsonStats: string[]) {
  return `     1d: $${jsonStats[0]}M (${jsonStats[1]})  7d: $${jsonStats[2]}M (${jsonStats[3]})  30d: $${jsonStats[4]}M (${jsonStats[5]})`;
}

export default async function command() {
  const jsonStats = await fetchStats();
  const subtitle = formatCommandSubtitle(jsonStats);

  updateCommandMetadata({ subtitle });
}
