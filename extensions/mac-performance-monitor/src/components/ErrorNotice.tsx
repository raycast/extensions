/**
 * Full-screen message shown when reading the performance data failed, so a read
 * error is never mistaken for "the app is not running".
 */

import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { OpenMonitorAction } from "./Actions";

interface ErrorNoticeProps {
  error: Error;
  onRetry: () => void;
}

export function ErrorNotice(props: ErrorNoticeProps) {
  const markdown = "## Could not read performance data\n\n```\n" + props.error.message + "\n```";

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={props.onRetry} />
          <OpenMonitorAction />
        </ActionPanel>
      }
    />
  );
}
