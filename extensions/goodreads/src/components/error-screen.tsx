import { Action, ActionPanel, List } from "@raycast/api";
import { STRINGS } from "../strings";

interface ErrorScreenProps {
  retry: () => void;
}

export function ErrorScreen(props: ErrorScreenProps) {
  return (
    <List>
      <List.EmptyView
        title={STRINGS.somethingWentWrong}
        description={STRINGS.tryAgain}
        actions={
          <ActionPanel>
            <Action title={STRINGS.retry} onAction={props.retry} />
          </ActionPanel>
        }
      />
    </List>
  );
}
