import { useEffect, useState } from "react";
import { APIInstance } from "../services/api";
import { SimpleBot } from "@coze/api";
import { getBotCache, setBotCache } from "../cache/bot";

const useBotInfo = (
  workspaceId: string,
  botId: string,
  api?: APIInstance,
): {
  isLoading: boolean;
  bot?: SimpleBot;
} => {
  // cache
  const cachedBot = getBotCache(botId);
  if (cachedBot) {
    return {
      isLoading: false,
      bot: cachedBot,
    };
  }

  const [isLoading, setIsLoading] = useState(true);
  const [bot, setBot] = useState<SimpleBot | undefined>();

  useEffect(() => {
    (async () => {
      if (!api || !workspaceId || !botId) return;
      try {
        setIsLoading(true);
        const bot = await api.getBotInfo({
          workspaceId,
          botId,
        });
        if (bot) {
          setBotCache(botId, bot);
          setBot(bot);
        }
      } catch (err) {
        const error = err as Error;
        console.error(`get bot info error: ${error}`);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [api, workspaceId, botId]);

  return {
    isLoading,
    bot,
  };
};

export default useBotInfo;
