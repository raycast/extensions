import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { ErrorResponse } from "../types";

type ErrorComponentProps = {
  errorResponse: ErrorResponse | Error;
};
export default function ErrorComponent({ errorResponse }: ErrorComponentProps) {
  const text = "text" in errorResponse ? errorResponse.text : "";
  const details = "text" in errorResponse ? errorResponse.details : errorResponse.message;
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
      markdown={`## ERROR - ${text}
    
${details}`}
    />
  );
}
