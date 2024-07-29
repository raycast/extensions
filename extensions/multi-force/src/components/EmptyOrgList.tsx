import { Action, ActionPanel, Detail } from "@raycast/api";
import { AuthenticateNewOrg } from "./AuthenticateNewOrg";

export function EmptyOrgList(props: { callback: () => Promise<void> }) {
  const markdown =
    "# Welcome to MultiForce!\nYour easy tool for logging in to your Salesforce orgs!\n\nIt doesn't look like you have added any orgs yet. Press **Enter** to authenticate your first org!";

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            title="Authenticate a New Org"
            target={<AuthenticateNewOrg callback={props.callback} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    />
  );
}
