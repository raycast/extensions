import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { ErrorResponse } from "../utils/types";

type ErrorComponentProps = {
  error: ErrorResponse;
};
export default function ErrorComponent({ error }: ErrorComponentProps) {
  const code = "code" in error ? ` | code: ${error.code}` : "";
  return (
    <Detail
      actions={
        <ActionPanel>
          {error.message.includes("Invalid API key") && (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          )}
        </ActionPanel>
      }
      markdown={`# ${error.status}${code}
    
${error.message}`}
    />
  );
}
