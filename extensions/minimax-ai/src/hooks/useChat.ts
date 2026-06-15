import { useState, useCallback, useRef, useEffect } from "react";
import { getPreferenceValues, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { Message } from "../providers/base";
import { MiniMaxProvider, API_ENDPOINTS } from "../providers/minimax";
import { handleError } from "../utils/errors";

interface UseChatReturn {
  streamingContent: string;
  isLoading: boolean;
  sendMessage: (messages: Message[]) => Promise<Message | null>;
  stopGeneration: () => void;
  isApiKeyValid: boolean | null;
}

export function useChat(): UseChatReturn {
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean | null>(null);
  const abortRef = useRef(false);
  const validatedKeyRef = useRef<string>("");

  // Validate API key on mount and re-validate when key changes
  useEffect(() => {
    const prefs = getPreferenceValues<Preferences>();
    if (prefs.minimaxApiKey === validatedKeyRef.current) return;

    const validateApiKey = async () => {
      validatedKeyRef.current = prefs.minimaxApiKey;
      const apiEndpoint = prefs.apiEndpoint === "international" ? API_ENDPOINTS.international : API_ENDPOINTS.china;

      const result = await MiniMaxProvider.validateApiKey(prefs.minimaxApiKey, apiEndpoint);
      setIsApiKeyValid(result.valid);

      if (result.valid === false) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid API Key",
          message: result.error || "Please check your API key in preferences",
          primaryAction: {
            title: "Open Preferences",
            onAction: () => openExtensionPreferences(),
          },
        });
      }
    };

    validateApiKey();
  });

  const getProvider = useCallback(() => {
    const prefs = getPreferenceValues<Preferences>();

    let systemPrompt = prefs.systemPrompt || "";
    if (prefs.conciseMode) {
      const conciseInstruction =
        "Be concise. Give brief, direct answers in 2-3 sentences maximum unless more detail is explicitly requested.";
      systemPrompt = systemPrompt ? `${conciseInstruction}\n\n${systemPrompt}` : conciseInstruction;
    }

    const apiEndpoint = prefs.apiEndpoint === "international" ? API_ENDPOINTS.international : API_ENDPOINTS.china;

    return new MiniMaxProvider({
      apiKey: prefs.minimaxApiKey,
      model: prefs.model,
      temperature: parseFloat(prefs.temperature) || 0.7,
      maxTokens: parseInt(prefs.maxTokens, 10) || 4096,
      systemPrompt: systemPrompt || undefined,
      apiEndpoint,
    });
  }, []);

  const sendMessage = useCallback(
    async (messages: Message[]): Promise<Message | null> => {
      if (isLoading) return null;

      // Check if API key is valid before sending
      if (isApiKeyValid === false) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid API Key",
          message: "Please check your API key in preferences",
          primaryAction: {
            title: "Open Preferences",
            onAction: () => openExtensionPreferences(),
          },
        });
        return null;
      }

      const prefs = getPreferenceValues<Preferences>();
      const provider = getProvider();
      abortRef.current = false;

      setIsLoading(true);
      setStreamingContent("");

      try {
        if (prefs.streamResponses) {
          return new Promise((resolve) => {
            let fullResponse = "";

            provider.chatStream(
              { messages },
              {
                onToken: (token) => {
                  if (abortRef.current) return;
                  fullResponse += token;
                  setStreamingContent(fullResponse);
                },
                onComplete: (response) => {
                  if (abortRef.current) {
                    setStreamingContent("");
                    setIsLoading(false);
                    resolve(null);
                    return;
                  }
                  const assistantMessage: Message = {
                    role: "assistant",
                    content: response,
                  };
                  setStreamingContent("");
                  setIsLoading(false);
                  resolve(assistantMessage);
                },
                onError: async (error) => {
                  setIsLoading(false);
                  setStreamingContent("");
                  await handleError(error);
                  resolve(null);
                },
              },
            );
          });
        } else {
          const response = await provider.chat({ messages });
          const assistantMessage: Message = {
            role: "assistant",
            content: response.content,
          };
          setIsLoading(false);
          return assistantMessage;
        }
      } catch (error) {
        setIsLoading(false);
        setStreamingContent("");
        await handleError(error);
        return null;
      }
    },
    [isLoading, getProvider, isApiKeyValid],
  );

  const stopGeneration = useCallback(() => {
    abortRef.current = true;
    setIsLoading(false);
    setStreamingContent("");
  }, []);

  return {
    streamingContent,
    isLoading,
    sendMessage,
    stopGeneration,
    isApiKeyValid,
  };
}
