import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { ErrorResponse } from "../utils/types";

type ErrorComponentProps = {
  error: ErrorResponse | Error;
};
export default function ErrorComponent({ error }: ErrorComponentProps) {
  return (
    <Detail
      actions={
        <ActionPanel>
          {error.message.includes("Invalid API key") && (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          )}
        </ActionPanel>
      }
      markdown={`# ERROR
    
${error.message}`}
    />
  );
}
