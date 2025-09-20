import { useState, useEffect } from "react";
import { SimpleBot } from "@coze/api";
import { APIInstance } from "../services/api";

const useBots = (api?: APIInstance, workspaceId?: string, defaultBotId?: string) => {
  const [bots, setBots] = useState<SimpleBot[]>([]);
  const [botId, setBotId] = useState<string>("");
  const [botError, setBotError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchBots = async () => {
      if (!api || !workspaceId) return;

      try {
        setIsLoading(true);
        const data = await api.listAllBots({
          space_id: workspaceId,
        });

        const items = defaultBotId
          ? (data?.items || []).filter((item) => item.bot_id === defaultBotId)
          : data?.items || [];

        setBots(items);
        if (items.length > 0) {
          setBotId(items[0].bot_id);
        }
      } catch (error) {
        console.error("Failed to fetch bots:", error);
        setBotError("Failed to load bots");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBots();
  }, [api, workspaceId]);

  return {
    bots,
    botId,
    setBotId,
    botError,
    isLoading,
  };
};

export default useBots;
