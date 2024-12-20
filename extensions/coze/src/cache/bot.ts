import { SimpleBot } from "@coze/api";
import { getCache, setCache } from "./cache";

export const getBotCacheKey = (botId: string) => {
  return `bot_${botId}`;
};

export const getBotCache = (botId: string): SimpleBot | undefined => {
  if (!botId) return undefined;
  return getCache<SimpleBot>(getBotCacheKey(botId));
};

export const setBotCache = (botId: string, bot: SimpleBot) => {
  if (!botId) return;
  setCache(getBotCacheKey(botId), bot);
};
