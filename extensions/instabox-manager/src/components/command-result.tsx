import { Action, ActionPanel, Color, Detail, Icon, Keyboard, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execCommand } from "../services/commands";
import { ExecRequest, ExecResult, Machine } from "../types";
import { describeError, errorToast } from "../utils/errors";
import { codeBlock } from "../utils/format";

// Raycast renders very long markdown slowly; the full output stays available to copy.
const MAX_SHOWN = 50_000;

interface CommandResultProps {
  machine: Machine;
  request: ExecRequest;
}

export function CommandResult({ machine, request }: CommandResultProps) {
  const { pop } = useNavigation();
  const { data, isLoading, error, revalidate } = usePromise(
    async (machineId: string, body: ExecRequest) => {
      const started = Date.now();
      const result = await execCommand(machineId, body);
      return { result, seconds: (Date.now() - started) / 1000 };
    },
    [machine.id, request],
    { onError: errorToast("Could not run the command") },
  );

  const result = data?.result;
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Run on ${machine.name}`}
      markdown={resultMarkdown(machine, request, isLoading, result, error)}
      metadata={
        result && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Machine" icon={Icon.ComputerChip} text={machine.name} />
            <Detail.Metadata.TagList title="Exit Code">
              <Detail.Metadata.TagList.Item
                text={String(result.exitCode)}
                color={result.exitCode === 0 ? Color.Green : Color.Red}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Duration" text={`${data.seconds.toFixed(1)} s`} />
            <Detail.Metadata.Label title="Directory" text={request.cwd || "/data/home"} />
            {result.timedOut && (
              <Detail.Metadata.Label title="Timed Out" text={`After ${request.timeoutSeconds ?? 60} s`} />
            )}
            {result.signal && <Detail.Metadata.Label title="Signal" text={result.signal} />}
            {result.truncated && <Detail.Metadata.Label title="Output" text="Cut at 1 MiB by InstaBox" />}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {result && <Action.CopyToClipboard title="Copy Output" content={result.stdout} />}
          {result?.stderr && (
            <Action.CopyToClipboard
              title="Copy Errors"
              content={result.stderr}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "e" },
                Windows: { modifiers: ["ctrl", "shift"], key: "e" },
              }}
            />
          )}
          <Action
            title="Run Again"
            icon={Icon.Repeat}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <Action title="Edit Command" icon={Icon.Pencil} shortcut={Keyboard.Shortcut.Common.Edit} onAction={pop} />
          <Action.CopyToClipboard title="Copy Command" content={request.cmd} shortcut={Keyboard.Shortcut.Common.Copy} />
        </ActionPanel>
      }
    />
  );
}

function shown(text: string) {
  if (text.length <= MAX_SHOWN) return { text, cut: false };
  return { text: text.slice(-MAX_SHOWN), cut: true };
}

function resultMarkdown(
  machine: Machine,
  request: ExecRequest,
  isLoading: boolean,
  result: ExecResult | undefined,
  error: Error | undefined,
) {
  const lines = [codeBlock(`$ ${request.cmd}`, "bash"), ""];
  if (isLoading && !result) {
    lines.push(`Running on **${machine.name}**…`);
    return lines.join("\n");
  }
  if (error && !result) {
    const { title, message } = describeError(error);
    lines.push(`**${title}**`, "", message ?? "");
    return lines.join("\n");
  }
  if (!result) return lines.join("\n");

  if (result.timedOut) lines.push(`> ⏱ Killed after ${request.timeoutSeconds ?? 60} seconds`, "");
  const stdout = shown(result.stdout);
  const stderr = shown(result.stderr);
  if (stdout.text) {
    lines.push("### Output", "", codeBlock(stdout.text), "");
    if (stdout.cut)
      lines.push(`_Showing the last ${MAX_SHOWN.toLocaleString()} characters. Copy Output has all of it._`, "");
  }
  if (stderr.text) {
    lines.push("### Errors", "", codeBlock(stderr.text), "");
    if (stderr.cut)
      lines.push(`_Showing the last ${MAX_SHOWN.toLocaleString()} characters. Copy Errors has all of it._`, "");
  }
  if (!stdout.text && !stderr.text) lines.push("_No output._");
  return lines.join("\n");
}
