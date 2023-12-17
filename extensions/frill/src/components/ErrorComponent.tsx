import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { MultiErrorResponse } from "../types";

type ErrorComponentProps = {
    error?: string;
    multiErrorsResponse?: MultiErrorResponse;
}
export default function ErrorComponent({ error="", multiErrorsResponse }: ErrorComponentProps) {
    const markdown = error ? `## ERROR: ${error}` : multiErrorsResponse ? `## ${multiErrorsResponse.message}
      
${Object.entries(multiErrorsResponse.errors).map(([key, val]) => `${key}: ${val[0]}`)}` : "";
    return <Detail markdown={markdown} navigationTitle="Error" actions={<ActionPanel>
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>} />
}