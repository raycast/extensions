import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { APP_URL } from "../utils/constants";

type Props = {
  error: string;
};
export default function ErrorComponent({ error }: Props) {
  return (
    <Detail
      markdown={
        error === "Unauthorized"
          ? `⚠️ Unauthorized
            
Please make sure your API Key is Valid`
          : `⚠️ Not Found
            
Please check if domain exists in Mailwip Dashboard`
      }
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            icon={Icon.WrenchScrewdriver}
            onAction={openExtensionPreferences}
          />
          <Action.OpenInBrowser title="Open Mailwip Dashboard" url={APP_URL} />
        </ActionPanel>
      }
    />
  );
}
