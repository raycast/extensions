import React from "react";
import { Action, Icon } from "@raycast/api";
import { ResultDetail } from "shared/ui/ResultDetail";

type OptimizedPromptDetailProps = {
  optimizedPrompt: string;
  onImprovePrompt?: () => void;
  showImprovePromptAction?: boolean;
  onRetry?: () => void;
  showRetryAction?: boolean;
  retryActionTitle?: string;
  copyActionTitle?: string;
  onBack?: () => void;
  backActionTitle?: string;
};

export const OptimizedPromptDetail: React.FC<OptimizedPromptDetailProps> = ({
  optimizedPrompt,
  onImprovePrompt,
  showImprovePromptAction = Boolean(onImprovePrompt),
  onRetry,
  showRetryAction = Boolean(onRetry),
  retryActionTitle = "Retry Optimization",
  copyActionTitle = "Copy Optimized Prompt",
  onBack,
  backActionTitle = "Back",
}) => {
  return (
    <ResultDetail
      markdown={optimizedPrompt}
      onRetry={onRetry}
      showRetryAction={showRetryAction}
      retryActionTitle={retryActionTitle}
      copyActionTitle={copyActionTitle}
      onBack={onBack}
      backActionTitle={backActionTitle}
      additionalActions={
        showImprovePromptAction && onImprovePrompt ? (
          <Action icon={Icon.LightBulb} title="Clarify Your Prompt" onAction={onImprovePrompt} />
        ) : null
      }
    />
  );
};
