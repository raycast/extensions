import { Action, ActionPanel, Detail, Icon, Keyboard, LaunchProps, openExtensionPreferences } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { getVariable } from "./api";

export default function Command(props: LaunchProps<{ arguments: Arguments.GetVariable }>) {
  const { variableName } = props.arguments;

  const { data, isLoading, error, revalidate } = usePromise(getVariable, [variableName]);

  useEffect(() => {
    if (error) {
      void showFailureToast(error, {
        title: "Unable to Load Variable",
        primaryAction: {
          title: "View Preferences",
          onAction: () => openExtensionPreferences(),
        },
      });
    }
  }, [error]);

  function formatVariableValue(): string {
    if (!data) return "";

    if (data.status === "error") {
      return `\`Error: ${data.error}\``;
    }

    if (data.data.type === "null") {
      return "`Variable does not exist or has null value`";
    }

    const typeLabel = data.data.type === "string" ? "String" : "Number";
    return `**Type:** ${typeLabel}\n\n**Value:** \`${data.data.value}\``;
  }

  const markdown = error
    ? `# ${variableName}\n\n\`There was an error retrieving the variable: ${error.message}\``
    : `# ${variableName}\n\n${isLoading ? "" : formatVariableValue()}`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {data?.status === "success" && data.data.type !== "null" && (
            <Action.CopyToClipboard
              title="Copy Value"
              content={String(data.data.value)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
          <Action
            title="Refresh"
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            icon={Icon.RotateClockwise}
          />
        </ActionPanel>
      }
    />
  );
}
