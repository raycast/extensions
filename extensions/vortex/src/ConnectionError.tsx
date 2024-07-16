import { ActionPanel, Detail, Action, openExtensionPreferences } from "@raycast/api";

export default function ConnectionError(props: { error: unknown }) {
  let message = "";
  if (props.error instanceof Error) {
    message = props.error.message;
  }
  if (props.error instanceof Object) {
    const e = props.error as { error: string };
    message = e.error;
  }

  return (
    <Detail
      markdown={`# Wallet connection failed.\n\n ## Please check the NWC connection details in extension preferences and try again. \n\n${message}`}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
