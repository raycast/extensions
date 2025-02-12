import { Action, ActionPanel, Detail, Icon, LaunchType, launchCommand, openExtensionPreferences } from "@raycast/api";
import { APP_URL } from "../utils/constants";

type Props = {
  error: string;
};
export default function ErrorComponent({ error }: Props) {
  if (error === "Missing Domains") {
    return (
      <Detail
        markdown={`⚠️ Missing Domains
            
Please add domains locally to get started.`}
        actions={
          <ActionPanel>
            <Action
              title="Go To Domains"
              icon={Icon.CommandSymbol}
              onAction={async () => await launchCommand({ name: "domains", type: LaunchType.UserInitiated })}
            />
            <Action.OpenInBrowser title="Open Mailwip Dashboard" url={APP_URL} />
          </ActionPanel>
        }
      />
    );
  } else if (error === "Unauthorized") {
    return (
      <Detail
        markdown={`⚠️ Unauthorized
              
  Please make sure your API Key is Valid`}
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
  } else {
    return (
      <Detail
        markdown={`⚠️ Not Found
              
  Please check if domain exists in Mailwip Dashboard`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Mailwip Dashboard" url={APP_URL} />
          </ActionPanel>
        }
      />
    );
  }
}
