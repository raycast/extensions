import { WorkspaceAction, WorkspaceMetadata } from "./workspace-command";
import { workspaceTitle } from "../lib/workspaces";
import { Keyboard, Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { execute, getToolSchema } from "../lib/client";
import { asJson, codeBlock, titleCase, toolLabel } from "../lib/format";
import { toolCallCode } from "../lib/execution";
import type { ToolSummary } from "../lib/types";
import { ExecutionResultView } from "./execution-result";
import { SavePreset } from "./save-preset";
import { ToolForm } from "./tool-form";

function ReviewTool({ tool, args }: { tool: ToolSummary; args: Record<string, unknown> }) {
  const { push } = useNavigation();
  const pending = useRef(false);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const code = toolCallCode(tool.address, args);
  async function run() {
    if (pending.current) return;
    pending.current = true;
    setStarted(true);
    setBusy(true);
    try {
      push(<ExecutionResultView initial={await execute(code)} code={code} />);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const markdown = [
    `# ${toolLabel(tool.name)}`,
    tool.description,
    "## Connection",
    `${titleCase(tool.owner)} / ${titleCase(tool.connection)}`,
    codeBlock(tool.address, "text"),
    "## Inputs",
    codeBlock(asJson(args)),
    "Executor will apply its current tool policies. Review the target and inputs before running.",
    ...(error
      ? [
          "## Could Not Confirm the Result",
          error,
          "The request was not retried. Check the upstream system before submitting it again.",
        ]
      : []),
  ].join("\n\n");
  return (
    <Detail
      isLoading={busy}
      navigationTitle={workspaceTitle("Review Tool Call")}
      metadata={<WorkspaceMetadata />}
      markdown={markdown}
      actions={
        <ActionPanel>
          {!started ? <Action title="Run Tool" icon={Icon.Play} onAction={run} /> : null}
          <Action.Push
            title="Save Input Preset"
            shortcut={Keyboard.Shortcut.Common.Save}
            icon={Icon.Star}
            target={<SavePreset tool={tool} args={args} />}
          />
          <Action.CopyToClipboard
            title="Copy Input JSON"
            shortcut={Keyboard.Shortcut.Common.Copy}
            content={asJson(args)}
          />
          <Action.CopyToClipboard title="Copy Code" content={code} />
          <WorkspaceAction />
        </ActionPanel>
      }
    />
  );
}

export function RunTool({ tool, initialArgs }: { tool: ToolSummary; initialArgs?: Record<string, unknown> }) {
  const { push } = useNavigation();
  const { data, isLoading, error, revalidate } = usePromise(getToolSchema, [tool.address]);
  if (!data && !error) return <Form isLoading={isLoading} navigationTitle={workspaceTitle(toolLabel(tool.name))} />;
  if (!data)
    return (
      <Detail
        isLoading={isLoading}
        markdown={`# Could Not Load Tool\n\n${error?.message ?? "The input schema is unavailable."}`}
        actions={
          error ? (
            <ActionPanel>
              <Action
                shortcut={Keyboard.Shortcut.Common.Refresh}
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
              />
              <WorkspaceAction />
            </ActionPanel>
          ) : undefined
        }
      />
    );
  return (
    <ToolForm
      tool={tool}
      schema={data}
      initialArgs={initialArgs}
      onSubmit={(args) => push(<ReviewTool tool={tool} args={args} />)}
    />
  );
}
