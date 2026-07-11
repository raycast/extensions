import { Action, ActionPanel } from "@raycast/api";

interface ImageActionProps {
  url: string;
}

export function ImageActionPanel(actionProps: ImageActionProps) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={actionProps.url} />
    </ActionPanel>
  );
}
