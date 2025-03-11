import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import React, { useEffect } from "react";
import { ALERT, SUCCESS_SUMMARIZING_VIDEO, SUMMARIZING_VIDEO } from "../../../const/toast_messages";
import { PerplexityPreferences } from "../../../summarizeVideoWithPerplexity";
import { getAiInstructionSnippet } from "../../../utils/getAiInstructionSnippets";
import { usePerplexityApi } from "./usePerplexityApi";

type GetPerplexitySummaryProps = {
  transcript?: string;
  setSummaryIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
};

export const usePerplexitySummary = ({ transcript, setSummaryIsLoading, setSummary }: GetPerplexitySummaryProps) => {
  const abortController = new AbortController();
  const preferences = getPreferenceValues() as PerplexityPreferences;
  const { language, creativity } = preferences;
  const perplexityApi = usePerplexityApi();

  useEffect(() => {
    let streamController: { abort: () => void; getFullResponse: () => string } | null = null;

    const setupStreaming = async () => {
      if (!transcript) return;

      setSummaryIsLoading(true);
      setSummary("");

      const aiInstructions = getAiInstructionSnippet(language, transcript, transcript);

      try {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: SUMMARIZING_VIDEO.title,
          message: SUMMARIZING_VIDEO.message,
        });

        const messages = [
          { role: "system", content: "Be precise and concise." },
          { role: "user", content: aiInstructions },
        ];

        // Use the streaming API
        streamController = await perplexityApi.streamRequest(
          {
            messages,
            temperature: parseFloat(creativity),
            maxTokens: 8192,
          },
          {
            onText: (delta) => {
              try {
                toast.show();
                setSummary((prevSummary) => {
                  const currentSummary = prevSummary || "";
                  return currentSummary + delta;
                });
              } catch (error) {
                console.error("Error in onText callback:", error);
              }
            },
            onComplete: () => {
              try {
                setSummaryIsLoading(false);
                toast.hide();
                showToast({
                  style: Toast.Style.Success,
                  title: SUCCESS_SUMMARIZING_VIDEO.title,
                  message: SUCCESS_SUMMARIZING_VIDEO.message,
                });
              } catch (error) {
                console.error("Error in onComplete callback:", error);
              }
            },
            onError: (error) => {
              try {
                if (abortController.signal.aborted) return;
                setSummaryIsLoading(false);
                toast.hide();
                showToast({
                  style: Toast.Style.Failure,
                  title: ALERT.title,
                  message: error.message,
                });
              } catch (callbackError) {
                console.error("Error in onError callback:", callbackError);
              }
            },
          },
          abortController.signal,
        );
      } catch (error) {
        console.error("Error setting up streaming:", error);
        setSummaryIsLoading(false);
        showToast({
          style: Toast.Style.Failure,
          title: ALERT.title,
          message: error instanceof Error ? error.message : "An unknown error occurred",
        });
      }
    };

    setupStreaming();

    return () => {
      try {
        if (streamController) {
          streamController.abort();
        }
        abortController.abort();
      } catch (error) {
        console.error("Error in cleanup:", error);
      }
    };
  }, [transcript]);
};
