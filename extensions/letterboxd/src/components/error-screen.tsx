import { Action, ActionPanel, Detail } from "@raycast/api";
import { STRINGS } from "../strings";

interface ErrorScreenProps {
  retry: () => void;
}

export function ErrorScreen(props: ErrorScreenProps) {
  return (
    <Detail
      markdown={`# ${STRINGS.somethingWentWrong}\n\n${STRINGS.tryAgain}`}
      actions={
        <ActionPanel>
          <Action title={STRINGS.retry} onAction={props.retry} />
        </ActionPanel>
      }
    />
  );
}
