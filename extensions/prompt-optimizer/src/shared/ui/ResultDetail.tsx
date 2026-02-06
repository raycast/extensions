import React from "react";
import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { convertSoftLineBreaksToHard } from "shared/lib/markdown";

type ResultDetailProps = {
  markdown: string;
  onRetry?: () => void;
  showRetryAction?: boolean;
  retryActionTitle?: string;
  copyActionTitle?: string;
  onBack?: () => void;
  backActionTitle?: string;
  additionalActions?: ActionPanel.Children;
};

export const ResultDetail: React.FC<ResultDetailProps> = ({
  markdown,
  onRetry,
  showRetryAction = Boolean(onRetry),
  retryActionTitle = "Retry",
  copyActionTitle = "Copy",
  onBack,
  backActionTitle = "Back",
  additionalActions,
}) => {
  return (
    <Detail
      markdown={convertSoftLineBreaksToHard(markdown)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={copyActionTitle} content={markdown} />
          {additionalActions}
          {showRetryAction && onRetry && <Action icon={Icon.Repeat} title={retryActionTitle} onAction={onRetry} />}
          {onBack && <Action icon={Icon.ArrowLeft} title={backActionTitle} onAction={onBack} />}
        </ActionPanel>
      }
    />
  );
};
