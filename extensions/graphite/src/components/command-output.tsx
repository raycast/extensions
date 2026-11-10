import { Action, ActionPanel, Detail } from "@raycast/api";

/** Full output of a `gt` command, for when a toast is not enough (conflicts, hooks, validation errors). */
export function CommandOutput(props: { command: string; output: string; failed: boolean }) {
  const { command, output, failed } = props;
  // Fence with more backticks than the output contains so CLI output can never break out of the code block.
  const longestRun = Math.max(2, ...(output.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longestRun + 1);
  const markdown = `## ${failed ? "Command failed" : "Command output"}\n\n\`${command}\`\n\n${fence}\n${output.trim() || "(no output)"}\n${fence}`;

  return (
    <Detail
      navigationTitle={command}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Output" content={output} />
          <Action.CopyToClipboard title="Copy Command" content={command} />
        </ActionPanel>
      }
    />
  );
}
