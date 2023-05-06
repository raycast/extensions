import { updateCommandMetadata } from "@raycast/api";
import fetch from "node-fetch";

async function fetchStats() {
  const stats: string[] = [];
  let data: any = {};

  const response = await fetch("https://ultrasound.money/api/fees/grouped-analysis-1");
  if (!response.ok) {
    throw Error(`Failed fetching stats (${response.statusText} - ${response.status})`);
  }
  data = await response.json();
  const name1 = data["leaderboards"]["leaderboard1h"][0]["twitterHandle"];
  const name2 = data["leaderboards"]["leaderboard1h"][1]["twitterHandle"];
  const name3 = data["leaderboards"]["leaderboard1h"][2]["twitterHandle"];
  const fees1 = data["leaderboards"]["leaderboard1h"][0]["fees"] / 1000000000000000000;
  const fees2 = data["leaderboards"]["leaderboard1h"][1]["fees"] / 1000000000000000000;
  const fees3 = data["leaderboards"]["leaderboard1h"][2]["fees"] / 1000000000000000000;

  //stats.push(name1, name2, name3, fees1.toFixed(2), fees2.toFixed(2), fees3.toFixed(2));
  stats.push(name1, name2, name3);
  return stats;
}

function formatCommandSubtitle(jsonStats: string[]) {
  //return `1. ${jsonStats[0]}: ${jsonStats[3]}  2. ${jsonStats[1]}: ${jsonStats[4]}  3. ${jsonStats[2]}: ${jsonStats[5]}`;
  return `1st: ${jsonStats[0]}   2nd: ${jsonStats[1]}   3rd: ${jsonStats[2]}`;
}

export default async function command() {
  const jsonStats = await fetchStats();
  const subtitle = formatCommandSubtitle(jsonStats);

  updateCommandMetadata({ subtitle });
}
