import { Detail, ActionPanel, Action, Icon, popToRoot, Clipboard, open } from "@raycast/api";
import { showHUD } from "@raycast/api";
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
          <Action
            title="Copy Tracking Number"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(trackingNumber);
              await showHUD("Tracking number copied to clipboard");
            }}
          />
          <Action
            title="Track on Ship24 Website"
            icon={Icon.Globe}
            onAction={() => open(`https://www.ship24.com/tracking?p=${trackingNumber}`)}
          />
          <Action title="Close" icon={Icon.ArrowLeft} onAction={popToRoot} />
        </ActionPanel>
      }
    />
  );
}
