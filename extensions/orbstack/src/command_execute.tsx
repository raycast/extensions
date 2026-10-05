import { Detail, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState } from "react";
import { ORB_CTL } from "./orbstack";

interface CommandConfirmProps {
  name: string;
  title: string;
  command: string[];
  markdown?: string;
  requireConfirmation?: boolean;
  refresh?: () => void;
}

export default function CommandExecute(props: CommandConfirmProps) {
  const { pop } = useNavigation();
  const { name, command, title, markdown, requireConfirmation, refresh } = props;
  const [shouldExecute, setShouldExecute] = useState(!requireConfirmation);
  const {
    data: commandOutput,
    isLoading,
    error,
    revalidate,
  } = useExec(ORB_CTL, command, {
    execute: shouldExecute,
    onData: () => {
      showToast({
        title: "Command executed successfully",
        style: Toast.Style.Success,
      });
      if (refresh) {
        refresh();
      }
    },
  });

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\nFailed to run command \`${ORB_CTL} ${command.join(" ")}\`\n${error.message}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={() => {
                revalidate();
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  let content = markdown ? markdown : `# ${name}\n## ${title}\n\`\`\`\n${commandOutput ?? ""}\n\`\`\`\n`;

  if (markdown && commandOutput) {
    content += `\n## Command Output \`\`\`\n${commandOutput}\`\`\``;
  }

  return (
    <Detail
      markdown={content}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            onAction={() => {
              revalidate();
              showToast({ title: "Refreshing..." });
            }}
          />
          {requireConfirmation && (
            <>
              <Action
                title="Cancel"
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => {
                  pop();
                }}
              />
              <Action
                title="Confirm Execution"
                shortcut={{ modifiers: ["cmd"], key: "y" }}
                onAction={() => {
                  setShouldExecute(true);
                }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
