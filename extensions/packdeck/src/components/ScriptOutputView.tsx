import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  Keyboard,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { LocalProject, ScriptExecutionResult, TerminalApp } from "../types";
import { formatDuration, formatPathForDisplay, stripAnsi, wrapCodeBlock } from "../lib/format";
import { notifyOperationResult } from "../lib/notifications";
import { buildRunScriptCommand, executeProjectScript } from "../lib/package-manager";
import { runCommandInTerminal } from "../lib/terminal";

interface ScriptOutputViewProps {
  project: LocalProject;
  scriptName: string;
  scriptCommand: string;
  extraArgs?: string[];
  initialResult?: ScriptExecutionResult;
}

export function ScriptOutputView({
  project,
  scriptName,
  scriptCommand,
  extraArgs = [],
  initialResult,
}: ScriptOutputViewProps) {
  const prefs = getPreferenceValues<Preferences>();
  const terminal = (prefs.preferredTerminal ?? "Terminal") as TerminalApp;
  const builtCmd = buildRunScriptCommand(project.packageManager, scriptName, extraArgs);
  const inFlightRef = useRef(false);
  const [shouldExecute, setShouldExecute] = useState(!initialResult);

  const {
    data,
    isLoading: isRunning,
    revalidate,
  } = usePromise(
    async () => {
      inFlightRef.current = true;
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Running "${scriptName}"...`,
        message: `${project.name} (${builtCmd.display})`,
      });
      try {
        const res = await executeProjectScript({
          project,
          scriptName,
          scriptCommand,
          extraArgs,
          additionalPath: prefs.additionalPath,
        });
        await toast.hide();
        await notifyOperationResult({
          title: res.exitCode === 0 ? `Script "${scriptName}" succeeded` : `Script "${scriptName}" failed`,
          message: `${project.name} · ${formatDuration(res.durationMs)}`,
          success: res.exitCode === 0,
          durationMs: res.durationMs,
        });
        return res;
      } finally {
        inFlightRef.current = false;
      }
    },
    [],
    { execute: shouldExecute },
  );

  const result = data ?? initialResult;

  async function handleRerun() {
    if (isRunning || inFlightRef.current) return;
    if (!shouldExecute) {
      setShouldExecute(true);
    } else {
      await revalidate();
    }
  }

  async function launchInTerminal() {
    const res = await runCommandInTerminal(project.path, builtCmd, terminal);
    await showToast({
      style: res.launched ? Toast.Style.Success : Toast.Style.Failure,
      title: res.launched ? `Launched in ${terminal}` : "Failed to launch terminal",
      message: res.launched ? builtCmd.display : res.error,
    });
  }

  const combinedRawOutput = result
    ? [stripAnsi(result.stdout), stripAnsi(result.stderr)].filter(Boolean).join("\n")
    : "";

  const markdown = isRunning
    ? `# Running \`${builtCmd.display}\`\n\nExecuting inside \`${formatPathForDisplay(project.path)}\`...\n\n> Tip: For long-running dev servers or watch tasks, press **⌘T** to run in **${terminal}**.`
    : result
      ? [
          `# \`${result.fullCommand}\``,
          result.timedOut
            ? "> **Timed out after 90s.** This looks like a long-running script — press **⌘T** to launch it interactively in your terminal."
            : "",
          "## Output",
          wrapCodeBlock(result.stdout || (result.exitCode === 0 ? "Completed with no stdout output." : ""), "text"),
          result.stderr.trim() ? `## Standard Error\n\n${wrapCodeBlock(result.stderr, "text")}` : "",
        ]
          .filter(Boolean)
          .join("\n\n")
      : "# Waiting to run script…";

  return (
    <Detail
      isLoading={isRunning}
      navigationTitle={`${scriptName} — ${project.name}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={
              isRunning
                ? "Running…"
                : result?.timedOut
                  ? "Timed Out"
                  : result?.exitCode === 0
                    ? "Succeeded (0)"
                    : `Failed (${result?.exitCode ?? "?"})`
            }
            icon={{
              source: isRunning ? Icon.Clock : result?.exitCode === 0 ? Icon.CheckCircle : Icon.XMarkCircle,
              tintColor: isRunning ? Color.Blue : result?.exitCode === 0 ? Color.Green : Color.Red,
            }}
          />
          <Detail.Metadata.Label title="Project" text={project.name} />
          <Detail.Metadata.Label title="Directory" text={formatPathForDisplay(project.path)} />
          <Detail.Metadata.Label title="Command" text={builtCmd.display} />
          <Detail.Metadata.Label title="Script Body" text={scriptCommand} />
          {result && <Detail.Metadata.Label title="Duration" text={formatDuration(result.durationMs)} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {!isRunning && (
            <Action
              title="Re-Run Script"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={handleRerun}
            />
          )}
          <Action
            title={`Run in ${terminal}`}
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={launchInTerminal}
          />
          <Action.CopyToClipboard
            title="Copy Output"
            content={combinedRawOutput || builtCmd.display}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard title="Copy Command" content={builtCmd.display} />
        </ActionPanel>
      }
    />
  );
}
