import { Action, ActionPanel, Detail } from "@raycast/api";

export default function Unauthorized() {
  return (
    <Detail
      markdown="# Authentication Error\n\nYour API key or email address may be incorrect. Please check your settings."
      metadata={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Settings" url="raycast://preferences" />
        </ActionPanel>
      }
    />
  );
}
