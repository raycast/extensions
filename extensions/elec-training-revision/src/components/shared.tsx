import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon } from "@raycast/api";

export const website = "https://elec.training/";

export function LearningLink() {
  return <Action.OpenInBrowser title="Explore Elec Training" url={website} icon={Icon.Globe} />;
}

export function ProgressError({
  error,
  reload,
  reset,
}: {
  error: string;
  reload: () => Promise<void>;
  reset: () => Promise<void>;
}) {
  return (
    <Detail
      markdown={`# Could not load progress\n\n${error}\n\nRetry loading, or reset your local revision history to start again.`}
      actions={
        <ActionPanel>
          <Action title="Retry Loading" icon={Icon.ArrowClockwise} onAction={reload} />
          <ResetProgress reset={reset} />
        </ActionPanel>
      }
    />
  );
}

export function ResetProgress({ reset }: { reset: () => Promise<void> }) {
  return (
    <Action
      title="Reset Revision Progress"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Reset revision progress?",
            message: "This removes all saved answers and accuracy history on this device.",
            primaryAction: { title: "Reset Progress", style: Alert.ActionStyle.Destructive },
          })
        )
          await reset();
      }}
    />
  );
}
