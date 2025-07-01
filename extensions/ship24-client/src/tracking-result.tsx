import { Detail, ActionPanel, Action, Icon, popToRoot } from "@raycast/api";
import { OptionalTracker } from "./types";
import { generateTrackingMarkdown } from "./utils/markdown-generator";

interface TrackingResultProps {
  trackingNumber: string;
  name?: string;
  tracking: OptionalTracker;
  error?: string;
}

export function TrackingResult({ trackingNumber, name, tracking, error }: TrackingResultProps) {
  const markdown = generateTrackingMarkdown({
    trackingNumber,
    name,
    tracking,
    error,
  });

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Close" icon={Icon.ArrowLeft} onAction={popToRoot} />
        </ActionPanel>
      }
    />
  );
}
