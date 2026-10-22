import { Detail, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ORB_CTL } from "./orbstack";

interface CommandConfirmProps {
  name: string;
  title: string;
  command: string[];
  /** Defaults to `orbctl`. Pass `docker` (with context args in `command`) for containers. */
  bin?: string;
  /**
   * Merge stderr into displayed output in write order (needed for `docker logs`).
   * Uses a shell redirect so stdout/stderr stay interleaved instead of concatenated buffers.
   */
  mergeStderr?: boolean;
  markdown?: string;
  requireConfirmation?: boolean;
  refresh?: () => void;
}

function shellQuote(arg: string): string {
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

export default function CommandExecute(props: CommandConfirmProps) {
  const { pop } = useNavigation();
  const { name, command, title, markdown, requireConfirmation, refresh, mergeStderr } = props;
  const bin = props.bin ?? ORB_CTL;
  const [shouldExecute, setShouldExecute] = useState(!requireConfirmation);

  const { execBin, execArgs } = useMemo(() => {
    if (!mergeStderr) {
      return { execBin: bin, execArgs: command };
    }

    // Merge at the shell so docker log lines keep arrival order across streams.
    const quoted = [bin, ...command].map(shellQuote).join(" ");
    return { execBin: "/bin/sh", execArgs: ["-c", `${quoted} 2>&1`] };
  }, [bin, command, mergeStderr]);

  const {
    data: commandOutput,
    isLoading,
    error,
    revalidate,
  } = useExec(execBin, execArgs, {
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
        markdown={`# Error\n\nFailed to run command \`${bin} ${command.join(" ")}\`\n${error.message}`}
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
