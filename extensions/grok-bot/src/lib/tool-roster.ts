import { listAgents } from "./gateway";
import { matchBotForSend, unmatchedSendMessage } from "./match-bot";
import { readCachedBots, writeCachedBotsIfEmpty } from "./roster-cache";
import { Bot, GatewayError, Result, gatewayErrorMessage, ok } from "./types";

export async function loadToolRoster(): Promise<Result<Bot[], GatewayError>> {
  const cached = readCachedBots();
  if (cached.length > 0) {
    return ok(cached);
  }

  const result = await listAgents({ avatars: "skip" });
  if (result.ok) {
    writeCachedBotsIfEmpty(result.value);
  }
  return result;
}

export async function resolveToolBot(query: string): Promise<Bot> {
  const cached = readCachedBots();
  if (cached.length > 0) {
    const cachedMatch = matchBotForSend(cached, query);
    if (cachedMatch.kind === "matched") {
      return cachedMatch.bot;
    }
  }

  const result = await listAgents({ avatars: "skip" });
  if (!result.ok) {
    throw new Error(gatewayErrorMessage(result.error));
  }

  if (cached.length === 0) {
    writeCachedBotsIfEmpty(result.value);
  }

  const match = matchBotForSend(result.value, query);
  if (match.kind !== "matched") {
    throw new Error(unmatchedSendMessage(query, match));
  }

  return match.bot;
}
