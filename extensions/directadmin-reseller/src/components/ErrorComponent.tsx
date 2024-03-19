import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { ErrorResponse } from "../types";

type ErrorComponentProps = {
  errorResponse: ErrorResponse;
};
export default function ErrorComponent({ errorResponse }: ErrorComponentProps) {
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
      markdown={`## ERROR - ${errorResponse.text || ""}
    
${errorResponse.details}`}
    />
  );
}
