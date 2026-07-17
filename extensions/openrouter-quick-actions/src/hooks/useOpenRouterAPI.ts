import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCompletionMetadata, openai } from "../api";
import { showToast, Toast } from "@raycast/api";
import { getSelectedText } from "@raycast/api";
import { Stream } from "openai/streaming";
import { APIPromise } from "openai";
import { getModelName } from "../utils";
import { ChatCompletionChunk } from "openai/resources";
import { ResultViewConfig, RequestMetadata } from "../type";

// Custom hook for API calls
export function useOpenRouterAPI(config: ResultViewConfig) {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [cost, setCost] = useState(0);
  const [lastRequestMetadata, setLastRequestMetadata] = useState<RequestMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const model = useMemo(() => getModelName(config.model_override), [config.model_override]);

  const getResult = useCallback(async () => {
    const now = new Date();
    let toast: Toast | undefined;

    if (config.toast_title && config.toast_title !== "") {
      toast = await showToast(Toast.Style.Animated, config.toast_title);
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const selectedText = await getSelectedText();

      const stream = await (openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: config.prompt },
          { role: "user", content: selectedText },
        ],
        provider: {
          sort: config.provider_sort === "global" ? undefined : config.provider_sort,
        },
        stream: true,
        usage: {
          include: true,
        },
        signal: abortControllerRef.current?.signal,
      } as never) as unknown as APIPromise<Stream<ChatCompletionChunk>>);

      if (!stream) return;

      let response_ = "";
      for await (const part of stream) {
        // Check if request was cancelled
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        const message = part.choices[0].delta.content;
        if (message) {
          response_ += message;
          setResponse(response_);
        }

        if (part.choices[0].finish_reason === "stop") {
          // Fetch metadata asynchronously as OpenRouter need some time to calculate/store the cost
          setTimeout(async () => {
            try {
              const metadata = await getCompletionMetadata(part.id);
              if (metadata) {
                const requestMetadata: RequestMetadata = {
                  provider: metadata.provider_name,
                  total_cost: metadata.total_cost,
                  model,
                  latencyMs: metadata.latency,
                  durationS: (metadata.generation_time / 1000).toFixed(2),
                };
                setLastRequestMetadata(requestMetadata);
                setCost(metadata.total_cost);
              }
            } catch (error) {
              console.error("Failed to fetch metadata:", error);
            }
          }, 1000);

          setLoading(false);

          const done = new Date();
          const duration = (done.getTime() - now.getTime()) / 1000;

          if (toast) {
            toast.style = Toast.Style.Success;
            toast.title = `Finished in ${duration.toFixed(2)} seconds`;
          }
          abortControllerRef.current = null;
          break;
        }
      }
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) {
        return; // Request was cancelled
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

      if (toast) {
        toast.title = "Error";
        toast.style = Toast.Style.Failure;
      }

      setLoading(false);
      setError(errorMessage);

      if (error instanceof Error && error.message.includes("getSelectedText")) {
        setResponse(
          "⚠️ Raycast was unable to get the selected text. You may try copying the text to a text editor and try again.",
        );
      } else {
        setResponse(
          `⚠️ Failed to get response from OpenRouter. Please check your network connection and API key. \n\n Error Message: \`\`\`${errorMessage}\`\`\``,
        );
      }
    }
  }, [config, model]);

  const runInference = useCallback(() => {
    setResponse("");
    setCost(0);
    setLastRequestMetadata(null);
    setError(null);
    getResult();
  }, [getResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    response,
    loading,
    cost,
    lastRequestMetadata,
    error,
    model,
    runInference,
  };
}
