import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCallback } from "react";
import { Readable } from "stream";
import { PERPLEXITY_MODEL } from "../../../const/defaults";
import { ALERT } from "../../../const/toast_messages";
import { PerplexityPreferences } from "../../../summarizeVideoWithPerplexity";

const PERPLEXITY_API_DEFAULTS = {
  url: "https://api.perplexity.ai/chat/completions",
  maxTokens: 8000,
  temperature: 0.7,
  topP: 0.9,
};

export type PerplexityStreamCallbacks = {
  onText: (text: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
};

/**
 * https://docs.perplexity.ai/api-reference/chat-completions
 */
export type PerplexityRequestOptions = {
  /**
   * A list of messages comprising the conversation so far.
   *
   * **messages.role**: The role of the speaker in this turn of conversation. After the (optional) system message, user and assistant roles should alternate with user then assistant, ending in user.
   *
   * **messages.content**: The contents of the message in this turn of conversation.
   * */
  messages: Array<{ role: string; content: string }>;
  /**
   * The name of the model that will complete your prompt. Refer to Supported Models to find all the models offered.
   * */
  model?: string;
  /**
   * The maximum number of completion tokens returned by the API. The number of tokens requested in max_tokens plus the number of prompt tokens sent in messages must not exceed the context window token limit of model requested. If left unspecified, then the model will generate tokens until either it reaches its stop token or the end of its context window.
   * */
  maxTokens?: number;
  /**
   * The amount of randomness in the response, valued between 0 inclusive and 2 exclusive. Higher values are more random, and lower values are more deterministic.
   * */
  temperature?: number;
  /**
   * The nucleus sampling threshold, valued between 0 and 1 inclusive. For each subsequent token, the model considers the results of the tokens with top_p probability mass. We recommend either altering top_k or top_p, but not both.
   * */
  topP?: number;
  /**
   * Determines whether or not to incrementally stream the response with server-sent events with content-type: text/event-stream.
   * */
  stream?: boolean;
};

interface ErrorResponse {
  error?: string;
}
interface NodeFetchResponse extends Omit<Response, "body"> {
  body: Readable | null;
}

const perplexityPromptGuide =
  "Rules: 1. Provide only the final answer. It is important that you do not include any explanation on the steps below. 2. Do not show the intermediate steps information.";

export const usePerplexityApi = () => {
  const preferences = getPreferenceValues() as PerplexityPreferences;
  const { perplexityApiToken, perplexityModel, creativity } = preferences;

  const validateApiKey = useCallback(() => {
    if (!perplexityApiToken || perplexityApiToken === "") {
      showToast({
        title: ALERT.title,
        message:
          "Perplexity API Key is required for this extension to work. You need to add your API key in preferences.",
        style: Toast.Style.Failure,
      });
      return false;
    }
    return true;
  }, [perplexityApiToken]);

  const sendRequest = useCallback(
    async (options: PerplexityRequestOptions) => {
      if (!validateApiKey()) return null;

      const {
        messages,
        model = perplexityModel || PERPLEXITY_MODEL,
        maxTokens = PERPLEXITY_API_DEFAULTS.maxTokens,
        temperature = parseFloat(creativity || PERPLEXITY_API_DEFAULTS.temperature),
        topP = PERPLEXITY_API_DEFAULTS.topP,
        stream = true,
      } = options;

      const requestOptions = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${perplexityApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: perplexityPromptGuide,
            },
            {
              role: "user",
              content: messages,
            },
          ],
          max_tokens: maxTokens,
          temperature,
          top_p: topP,
          stream,
        }),
      };

      try {
        const response = await fetch(PERPLEXITY_API_DEFAULTS.url, requestOptions);

        if (!response.ok) {
          const errorResponse = (await response.json().catch(() => ({ error: "Unknown error" }))) as ErrorResponse;
          const errorMessage = errorResponse.error || `API request failed with status ${response.status}`;
          throw new Error(errorMessage);
        }

        return response.json();
      } catch (error) {
        console.error("Perplexity API error:", error);
        throw error;
      }
    },
    [perplexityApiToken, perplexityModel, creativity, validateApiKey],
  );

  const streamRequest = useCallback(
    async (options: PerplexityRequestOptions, callbacks: PerplexityStreamCallbacks, abortSignal?: AbortSignal) => {
      if (!validateApiKey()) return null;

      const {
        messages,
        model = perplexityModel || PERPLEXITY_MODEL,
        maxTokens = PERPLEXITY_API_DEFAULTS.maxTokens,
        temperature = parseFloat(creativity || PERPLEXITY_API_DEFAULTS.temperature),
        topP = PERPLEXITY_API_DEFAULTS.topP,
      } = options;

      let isAborted = false;
      let fullResponse = "";

      if (abortSignal) {
        abortSignal.addEventListener("abort", () => {
          isAborted = true;
        });
      }

      const abortableController = {
        abort: () => {
          isAborted = true;
          if (abortSignal && !abortSignal.aborted) {
            const controller = abortSignal as { abort?: () => void };
            if (typeof controller.abort === "function") {
              controller.abort();
            }
          }
        },
        getFullResponse: () => fullResponse,
      };

      (async () => {
        try {
          const streamingRequestOptions = {
            method: "POST",
            headers: {
              Authorization: `Bearer ${perplexityApiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "system",
                  content: perplexityPromptGuide,
                },
                ...messages,
              ],
              max_tokens: maxTokens,
              temperature,
              top_p: topP,
              stream: true,
            }),
            signal: abortSignal,
          };

          const response = (await fetch(
            PERPLEXITY_API_DEFAULTS.url,
            streamingRequestOptions,
          )) as unknown as NodeFetchResponse;

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `API request failed with status ${response.status}`;
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.error) {
                errorMessage = errorJson.error;
              }
            } catch (e) {
              console.error("Error parsing JSON:", e);
            }
            throw new Error(errorMessage);
          }

          if (response.body) {
            let buffer = "";

            response.body.on("data", (chunk: Buffer) => {
              if (isAborted) return;

              const chunkText = chunk.toString();
              buffer += chunkText;

              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (isAborted) break;

                if (line.trim() === "") continue;
                if (line.startsWith("data: ")) {
                  const jsonStr = line.slice(6).trim();
                  if (jsonStr === "[DONE]") continue;

                  try {
                    const json = JSON.parse(jsonStr);
                    if (json.choices && json.choices[0]?.delta?.content) {
                      const content = json.choices[0].delta.content;
                      fullResponse += content;
                      callbacks.onText(content);
                    }
                  } catch (e) {
                    console.error("Error parsing JSON:", e);
                  }
                }
              }
            });

            response.body.on("end", () => {
              if (!isAborted) {
                if (buffer.trim() !== "") {
                  const lines = buffer.split("\n");
                  for (const line of lines) {
                    if (line.trim() === "" || !line.startsWith("data: ")) continue;

                    const jsonStr = line.slice(6).trim();
                    if (jsonStr === "[DONE]") continue;

                    try {
                      const json = JSON.parse(jsonStr);
                      if (json.choices && json.choices[0]?.delta?.content) {
                        const content = json.choices[0].delta.content;
                        fullResponse += content;
                        callbacks.onText(content);
                      }
                    } catch (e) {
                      console.error("Error parsing JSON in buffer remainder:", e);
                    }
                  }
                }

                callbacks.onComplete();
              }
            });

            response.body.on("error", (err: Error) => {
              if (!isAborted) {
                callbacks.onError(err);
              }
            });
          } else {
            throw new Error("Response body is null");
          }
        } catch (error: unknown) {
          if (!isAborted) {
            if (error instanceof Error) {
              callbacks.onError(error);
            } else {
              callbacks.onError(new Error(String(error)));
            }
          }
        }
      })();

      return abortableController;
    },
    [perplexityApiToken, perplexityModel, creativity, validateApiKey],
  );

  return {
    sendRequest,
    streamRequest,
  };
};
