import { Action, ActionPanel } from "@raycast/api";

interface PRDescriptionActionsProps {
  description: string;
  branchName: string | null;
}

export function PRDescriptionActions({ description, branchName }: PRDescriptionActionsProps) {
  return (
    <ActionPanel title={branchName ? `Branch: ${branchName}` : "Branch name"}>
      <Action.Paste title="Paste PR Description" content={description} />
      <Action.CopyToClipboard
        title="Copy PR Description"
        content={description}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    </ActionPanel>
  );
}
