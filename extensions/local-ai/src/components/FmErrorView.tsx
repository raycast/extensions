import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import type { FmError } from "../lib/fm/errors";
import { isSetupError } from "../services/errors";
import { usePreflight } from "../hooks/usePreflight";
import { FeedbackAction } from "./FeedbackAction";
import { SetupStatus } from "./SetupStatus";

export function FmErrorView(props: { error: FmError; onRetry?: () => void }) {
  if (isSetupError(props.error)) return <SetupErrorView message={props.error.message} />;

  const detail = props.error.detail ? `\n\n\`\`\`\n${props.error.detail}\n\`\`\`` : "";
  return (
    <Detail
      markdown={`# Something went wrong\n\n${props.error.message}${detail}`}
      actions={
        <ActionPanel>
          {props.onRetry && <Action title="Retry" icon={Icon.ArrowClockwise} onAction={props.onRetry} />}
          <ActionPanel.Section>
            <FeedbackAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SetupErrorView(props: { message: string }) {
  const { result, isLoading, recheck } = usePreflight({ force: true });
  return <SetupStatus result={result} isLoading={isLoading} onRecheck={recheck} error={props.message} />;
}
