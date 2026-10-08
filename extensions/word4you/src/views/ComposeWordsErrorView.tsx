import { Detail, ActionPanel, Action, Icon } from "@raycast/api";

interface ComposeWordsErrorViewProps {
  error: string;
  onRetry: () => void;
}

export function ComposeWordsErrorView({ error, onRetry }: ComposeWordsErrorViewProps) {
  return (
    <Detail
      markdown={`# Error

${error}`}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.RotateClockwise} onAction={onRetry} />
        </ActionPanel>
      }
    />
  );
}
