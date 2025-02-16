import {
  Action,
  ActionPanel,
  Detail,
  getFrontmostApplication,
  Icon,
  Keyboard,
  LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import { useAI, usePromise } from "@raycast/utils";

import { useMemo } from "react";

import { extractCommitCommand } from "../utils/extract-commit-command";

export function CommitMessageResult(props: Readonly<LaunchProps<{ arguments: { prompt: string } }>>) {
  const { data: frontMostApplication, isLoading: isFrontMostApplicationLoading } = usePromise(getFrontmostApplication);

  const {
    data: markdown,
    isLoading,
    error,
    revalidate,
  } = useAI(props.arguments.prompt, {
    creativity: "medium",
    onData: () => {
      showToast({ style: Toast.Style.Success, title: "Commit Message Generated" });
    },
    onError: (error) => {
      showToast({ style: Toast.Style.Failure, title: "Failed to Generate Commit Message", message: String(error) });
    },
  });

  const command = useMemo(() => extractCommitCommand(markdown), [markdown]);

  return (
    <Detail
      isLoading={isLoading || isFrontMostApplicationLoading}
      markdown={error ? `## There was an error while generating commit message` : markdown}
      actions={
        <ActionPanel>
          {command && (
            <>
              <Action.CopyToClipboard
                title="Copy Command to Clipboard"
                shortcut={Keyboard.Shortcut.Common.Copy}
                content={command}
              />

              <Action.Paste
                title={`Paste Response to ${frontMostApplication?.name}`}
                shortcut={{ modifiers: ["cmd"], key: "v" }}
                content={command}
              />

              <Action
                icon={Icon.Redo}
                title="Regenerate"
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => revalidate()}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
