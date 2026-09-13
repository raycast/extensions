import { AgentId, Bot } from "./types";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export type MatchBotForSend =
  { kind: "matched"; bot: Bot } | { kind: "ambiguous"; candidates: Bot[] } | { kind: "none" };

export function matchBotForSend(bots: Bot[], query: string): MatchBotForSend {
  const needle = normalize(query);
  if (needle.length === 0) {
    return { kind: "none" };
  }

  const byId = bots.find((bot) => normalize(bot.id) === needle);
  if (byId) {
    return { kind: "matched", bot: byId };
  }

  const byName = bots.find((bot) => normalize(bot.name) === needle);
  if (byName) {
    return { kind: "matched", bot: byName };
  }

  const substringHits = bots.filter(
    (bot) => normalize(bot.name).includes(needle) || normalize(bot.title).includes(needle),
  );
  if (substringHits.length === 1) {
    const [bot] = substringHits;
    if (bot) {
      return { kind: "matched", bot };
    }
  }
  if (substringHits.length > 1) {
    return { kind: "ambiguous", candidates: substringHits };
  }

  return { kind: "none" };
}

export function unmatchedSendMessage(query: string, result: Exclude<MatchBotForSend, { kind: "matched" }>): string {
  switch (result.kind) {
    case "ambiguous":
      return `No bot matched "${query}". Candidates: ${result.candidates.map((bot) => bot.name).join(", ")}.`;
    case "none":
      return `No bot matched "${query}". Use list-bots to see teammates.`;
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

export function matchesListQuery(bot: Bot, query: string): boolean {
  const needle = normalize(query);
  if (needle.length === 0) {
    return true;
  }

  return (
    normalize(bot.name).includes(needle) ||
    normalize(bot.title).includes(needle) ||
    normalize(bot.description).includes(needle)
  );
}

export type BotGroups = {
  favorites: Bot[];
  individuals: Bot[];
  groups: Bot[];
  hidden: Bot[];
};

function partitionBots(input: {
  matching: Bot[];
  favoriteIds: readonly AgentId[];
  includeUnfavoritedHidden: boolean;
}): BotGroups {
  const favoriteSet = new Set(input.favoriteIds);
  const byId = new Map(input.matching.map((bot) => [bot.id, bot]));
  const favorites = input.favoriteIds.flatMap((id) => {
    const bot = byId.get(id);
    return bot ? [bot] : [];
  });
  const rest = input.matching.filter((bot) => !favoriteSet.has(bot.id));
  return {
    favorites,
    individuals: rest.filter((bot) => !bot.isGroup && !bot.isHidden),
    groups: rest.filter((bot) => bot.isGroup && !bot.isHidden),
    hidden: input.includeUnfavoritedHidden ? rest.filter((bot) => bot.isHidden) : [],
  };
}

export function filterBotsForList(input: { bots: Bot[]; query: string; favoriteIds?: readonly AgentId[] }): BotGroups {
  const trimmed = input.query.trim();
  const matching = trimmed.length === 0 ? input.bots : input.bots.filter((bot) => matchesListQuery(bot, trimmed));
  return partitionBots({
    matching,
    favoriteIds: input.favoriteIds ?? [],
    includeUnfavoritedHidden: trimmed.length > 0,
  });
}

export function groupBotsForDropdown(input: { bots: Bot[]; favoriteIds?: readonly AgentId[] }): BotGroups {
  return partitionBots({
    matching: input.bots,
    favoriteIds: input.favoriteIds ?? [],
    includeUnfavoritedHidden: true,
  });
}

export function resolveInitialBot(input: { bots: Bot[]; query?: string; lastId: AgentId | null }): Bot | null {
  if (input.query) {
    const named = matchBotForSend(input.bots, input.query);
    if (named.kind === "matched") {
      return named.bot;
    }
  }

  if (input.lastId) {
    const last = input.bots.find((bot) => bot.id === input.lastId);
    if (last) {
      return last;
    }
  }

  return input.bots[0] ?? null;
}
