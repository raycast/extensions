import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { IS_CLOUD } from "../lib/umami";

export default function ErrorComponent({ error }: { error: Error }) {
  const { message } = error;

  let markdown = `# ERROR \n\n ${message} \n\n`;
  if (message.includes("Unauthorized")) {
    if (IS_CLOUD) {
      markdown += "Please make sure the following are valid: `UMAMI_API_KEY`, `UMAMI_API_CLIENT_ENDPOINT`";
    } else {
      markdown +=
        "Please make sure the following are valid: `UMAMI_API_CLIENT_USER_ID`, `UMAMI_API_CLIENT_SECRET`, `UMAMI_API_CLIENT_ENDPOINT`";
    }
  }

  return (
    <Detail
      navigationTitle="Error"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
