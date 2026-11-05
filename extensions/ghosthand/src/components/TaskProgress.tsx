import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { useEffect, useSyncExternalStore } from "react";
import type { TaskRun } from "../lib/task-run";
import { markdownText } from "../utils/device-status";
import { ScreenPreview } from "./ScreenPreview";

export function TaskProgress({ run }: { run: TaskRun }) {
  const state = useSyncExternalStore(run.subscribe, run.snapshot);
  const { pop } = useNavigation();
  const active = state.status === "running" || state.status === "stopping";
  useEffect(() => run.attachView(), [run]);
  const markdown = [
    `# ${markdownText(state.progress)}`,
    `**${markdownText(run.phone.name)}**`,
    `## Instruction\n\n${markdownText(run.prompt)}`,
    state.notice ? `## Account Notice\n\n${markdownText(state.notice)}` : "",
    state.text
      ? `## ${state.status === "completed" ? "Response" : "Latest Response"}\n\n${markdownText(state.text)}`
      : "",
    state.error
      ? `## ${state.status === "stopped" ? "Stopped" : "Needs Attention"}\n\n${markdownText(state.error)}`
      : "",
    !run.streaming && active
      ? "Final-response mode: progress is unavailable. Stopping closes the request and attempts release; the operation may continue until Ghosthand finishes it."
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return (
    <Detail
      isLoading={active}
      navigationTitle={`Task · ${run.phone.name}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          {active && <Action title="Stop Task" icon={Icon.Stop} onAction={run.cancel} />}
          <Action.Push
            title="Refresh Screen"
            icon={Icon.Mobile}
            target={<ScreenPreview phone={run.phone} allowControl={false} />}
          />
          {!active && <Action title="Run Another Task" icon={Icon.ArrowClockwise} onAction={pop} />}
          {!active && state.text && (
            <Action.CopyToClipboard title="Copy Response" content={state.text} icon={Icon.Clipboard} />
          )}
        </ActionPanel>
      }
    />
  );
}
