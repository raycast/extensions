import { useState } from "react";
import { APIInstance, Conversation } from "../services/api";

const useCreateConversation = (api?: APIInstance) => {
  const [isLoading, setIsLoading] = useState(false);
  const [createConversationError, setCreateConversationError] = useState<string | undefined>();

  const createConversation = async (workspaceId: string, botId: string): Promise<Conversation | undefined> => {
    if (!api) {
      return undefined;
    }

    try {
      setIsLoading(true);
      setCreateConversationError(undefined);
      return await api.createConversation({ workspaceId, botId });
    } catch (err) {
      console.error("Failed to create conversation:", err);
      setCreateConversationError("Failed to create conversation");
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createConversationError,
    createConversation,
  };
};

export default useCreateConversation;
