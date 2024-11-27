import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { ErrorResponse } from "../types";

type ErrorComponentProps = {
  response: ErrorResponse;
};
export default function ErrorComponent({ response }: ErrorComponentProps) {
  let responseMarkdown = "Unknown Error";
  let responseNavigationTitle = "Error";
  if ("error" in response) {
    responseMarkdown = `## ERROR: ${response.error}`;
  } else if ("errors" in response) {
    responseMarkdown = `## ${response.message}
      
${Object.entries(response.errors).map(([key, val]) => `${key}: ${val[0]}`)}`;
    responseNavigationTitle = "Errors";
  }

  return (
    <Detail
      markdown={responseMarkdown}
      navigationTitle={responseNavigationTitle}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
