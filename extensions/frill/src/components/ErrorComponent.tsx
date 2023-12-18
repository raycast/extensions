import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { SingleErrorResponse, MultiErrorResponse } from "../types";

type ErrorComponentProps = {
    response?: SingleErrorResponse | MultiErrorResponse;
    error?: string;
    multiErrorsResponse?: MultiErrorResponse;
}
export default function ErrorComponent({ error="", multiErrorsResponse, response }: ErrorComponentProps) {
    if (response) {
        let responseMarkdown = "Unknown Error";
        let responseNavigationTitle = "Error";
        if ("error" in response) {
            responseMarkdown = `## ERROR: ${error}`;
        } else if ("errors" in response) {
            responseMarkdown = `## ${response.message}
      
${Object.entries(response.errors).map(([key, val]) => `${key}: ${val[0]}`)}`
            responseNavigationTitle = "Errors";
        }

        return <Detail markdown={responseMarkdown} navigationTitle={responseNavigationTitle} actions={<ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>} />
    }

    const markdown = error ? `## ERROR: ${error}` : multiErrorsResponse ? `## ${multiErrorsResponse.message}
      
${Object.entries(multiErrorsResponse.errors).map(([key, val]) => `${key}: ${val[0]}`)}` : "";
    return <Detail markdown={markdown} navigationTitle="Error" actions={<ActionPanel>
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>} />
}