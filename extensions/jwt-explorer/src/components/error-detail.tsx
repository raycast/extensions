import { Action, ActionPanel, Detail } from "@raycast/api";

import { jwtLogo } from "../constants";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack || ""}`;
  } else if (typeof error === "string") {
    return error;
  } else {
    try {
      return JSON.stringify(error);
    } catch {
      return "Error object cannot be serialized";
    }
  }
}

export function ErrorDetail(props: { error: unknown; value: string }) {
  const message = "An unexpected error occurred. Please ensure that you have selected or copied the correct JWT token.";
  return (
    <Detail
      markdown={`<img width="70" src="${jwtLogo}" />\n\n# ${message}\n\`\`\`\n${props.value}\n\`\`\``}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title={`Copy Error`} content={getErrorMessage(props.error)} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
