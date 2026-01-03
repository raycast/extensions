import type { BetterAliasesConfig } from "../types";
import { loadBetterAliasesAsync } from "./betterAliases";
import { getLeaderKeyAliasesAsync } from "./leaderKeyAliases";

export async function getAllAliasesConfigAsync(): Promise<BetterAliasesConfig> {
  const [leaderKeyAliases, betterAliases] = await Promise.all([getLeaderKeyAliasesAsync(), loadBetterAliasesAsync()]);

  return { ...leaderKeyAliases, ...betterAliases };
}
