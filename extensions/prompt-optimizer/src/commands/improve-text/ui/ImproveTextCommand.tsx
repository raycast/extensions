import React, { useCallback, useState } from "react";
import { Toast, showToast } from "@raycast/api";
import { improveText } from "commands/improve-text/lib/improve-text";
import { ImproveTextForm, TONE_OPTIONS } from "./ImproveTextForm";
import { ImproveTextFormValues } from "commands/improve-text/types";
import { useLLMRequest } from "shared/hooks/useLLMRequest";
import { ResultDetail } from "shared/ui/ResultDetail";

type ImproveTextSession = {
  sourceText: string;
  instructions?: string;
  tone?: string;
  disableAgentStyleFormatting: boolean;
  improvedText: string;
};

export const ImproveTextCommand: React.FC = () => {
  const [session, setSession] = useState<ImproveTextSession | null>(null);
  const { isLoading, errorState, runRequest } = useLLMRequest();

  const handleImproveText = useCallback(
    async (values: ImproveTextFormValues) => {
      if (!values.sourceText.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Source text is required",
        });
        return;
      }

      setSession(null);

      const toneInfo = TONE_OPTIONS.find((option) => option.value === values.tone);

      await runRequest({
        execute: () =>
          improveText({
            sourceText: values.sourceText,
            instructions: values.instructions,
            tone: toneInfo ? `${toneInfo.title} (${toneInfo.description})` : undefined,
            disableAgentStyleFormatting: values.disableAgentStyleFormatting,
          }),
        onSuccess: (response) => {
          setSession({
            sourceText: values.sourceText,
            instructions: values.instructions,
            tone: values.tone,
            disableAgentStyleFormatting: values.disableAgentStyleFormatting,
            improvedText: response.improvedText,
          });
        },
        inProgressTitle: "Improving text...",
        successTitle: "Text improved",
        failureTitle: "Improvement failed",
        errorStateTitle: "Improvement failed",
      });
    },
    [runRequest],
  );

  const handleRetryImproveText = useCallback(async () => {
    if (!session) {
      await showToast({ style: Toast.Style.Failure, title: "Missing improvement context" });
      return;
    }

    const toneInfo = TONE_OPTIONS.find((option) => option.value === session.tone);

    await runRequest({
      execute: () =>
        improveText({
          sourceText: session.sourceText,
          instructions: session.instructions,
          tone: toneInfo ? `${toneInfo.title} (${toneInfo.description})` : undefined,
          disableAgentStyleFormatting: session.disableAgentStyleFormatting,
        }),
      onSuccess: (response) => {
        setSession({
          ...session,
          improvedText: response.improvedText,
        });
      },
      inProgressTitle: "Retrying improvement...",
      successTitle: "Text improved",
      failureTitle: "Improvement failed",
    });
  }, [session, runRequest]);

  if (session) {
    return (
      <ResultDetail
        markdown={session.improvedText}
        copyActionTitle="Copy Improved Text"
        onRetry={handleRetryImproveText}
        retryActionTitle="Retry Improvement"
      />
    );
  }

  return <ImproveTextForm isImproving={isLoading} errorState={errorState} onSubmit={handleImproveText} />;
};
