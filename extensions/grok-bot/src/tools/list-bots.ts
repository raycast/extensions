import { matchesListQuery } from "../lib/match-bot";
import { loadToolRoster } from "../lib/tool-roster";
import { Bot, gatewayErrorMessage } from "../lib/types";

type Input = {
  /**
   * Optional name or title filter. Omit or leave empty to list every teammate, including hidden ones.
   *
   * @example "Piper"
   */
  query?: string;
};

export type ListBotRow = {
  id: Bot["id"];
  name: string;
  title: string;
  status: Bot["status"];
  isGroup: boolean;
  isHidden: boolean;
};

export function toListBotsResult(bots: Bot[], query?: string): ListBotRow[] {
  const trimmed = query?.trim() ?? "";
  const matching = trimmed.length === 0 ? bots : bots.filter((bot) => matchesListQuery(bot, trimmed));
  return matching.map((bot) => ({
    id: bot.id,
    name: bot.name,
    title: bot.title,
    status: bot.status,
    isGroup: bot.isGroup,
    isHidden: bot.isHidden,
  }));
}

/**
 * List Grok Bot teammates. Optional query filters by name or title.
 */
export default async function tool(input: Input) {
  const botsResult = await loadToolRoster();
  if (!botsResult.ok) {
    throw new Error(gatewayErrorMessage(botsResult.error));
  }

  return toListBotsResult(botsResult.value, input.query);
}
