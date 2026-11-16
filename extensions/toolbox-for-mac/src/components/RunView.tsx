import { Action, ActionPanel, Detail, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { basename } from "node:path";
import { useMemo, useRef } from "react";
import {
  appPath,
  buildArgs,
  formatBytes,
  run,
  RunResult,
  STORE_URL,
  summarize,
  Tool,
  ToolboxError,
  Values,
} from "../lib/toolbox";

type State = { status: "running" } | { status: "done"; result: RunResult } | { status: "failed"; error: ToolboxError };

/** Runs the tool once and shows what it made. Leaving the view aborts the run, which stops Toolbox. */
export function RunView({ tool, values }: { tool: Tool; values: Values }) {
  const abortable = useRef<AbortController>(null);
  const toast = useRef<Promise<Toast>>(null);
  const args = useMemo(() => buildArgs(tool, values), [tool, values]);
  const { data, error, isLoading } = usePromise(
    (name: string, toolArgs: string[]) => run(name, toolArgs, abortable.current?.signal),
    [tool.name, args],
    {
      abortable,
      onWillExecute: () => {
        toast.current = showToast({ style: Toast.Style.Animated, title: `${tool.title}…` });
      },
      onData: async (result) => {
        const t = await toast.current;
        if (!t) return;
        t.style = Toast.Style.Success;
        t.title = `${tool.title} done`;
        t.message = summarize(result);
      },
      onError: async (e) => {
        if (abortable.current?.signal.aborted) return;
        const t = await toast.current;
        if (!t) return;
        t.style = Toast.Style.Failure;
        t.title = `${tool.title} failed`;
        t.message = e.message;
      },
    },
  );
  const state: State = isLoading
    ? { status: "running" }
    : error
      ? { status: "failed", error: error instanceof ToolboxError ? error : new ToolboxError(String(error)) }
      : data
        ? { status: "done", result: data }
        : { status: "running" };

  if (state.status === "running") {
    const items = (values.files ?? values.urls ?? []) as string[];
    return (
      <Detail
        isLoading
        navigationTitle={tool.title}
        markdown={`## ${tool.title}\n\nWorking on ${items.length} item${items.length === 1 ? "" : "s"}… Toolbox runs this on your Mac; nothing is uploaded.\n\nGo back to stop.`}
      />
    );
  }

  if (state.status === "failed") {
    const { error } = state;
    return (
      <Detail
        navigationTitle={tool.title}
        markdown={`## ${tool.title} didn't finish\n\n${error.message}`}
        actions={
          <ActionPanel>
            {error.kind === "missing" || error.kind === "license" ? (
              <Action.OpenInBrowser title="Get Toolbox" url={STORE_URL} />
            ) : (
              <Action.Open title="Open Toolbox" target={appPath()} icon={Icon.AppWindow} />
            )}
            <Action.CopyToClipboard title="Copy Error" content={error.message} />
          </ActionPanel>
        }
      />
    );
  }

  const { result } = state;
  const first = result.outputs[0]?.path;
  const text = result.text?.trim();
  const rows = result.outputs
    .map((o) => {
      const before = o.source_size_bytes ? `${formatBytes(o.source_size_bytes)} → ` : "";
      return `| ${basename(o.path)} | ${before}${formatBytes(o.size_bytes)} |`;
    })
    .join("\n");
  const markdown = [
    `## ✓ ${tool.title} done`,
    summarize(result),
    result.outputs.length ? `| File | Size |\n|---|---|\n${rows}` : "",
    text ? "```\n" + text.slice(0, 8000) + (text.length > 8000 ? "\n…" : "") + "\n```" : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      navigationTitle={tool.title}
      markdown={markdown}
      actions={
        <ActionPanel>
          {text && <Action.CopyToClipboard title="Copy Text" content={text} />}
          {first && <Action.ShowInFinder path={first} />}
          {first && <Action.Open title="Open Result" target={first} />}
          {result.outputs.length > 0 && (
            <Action.CopyToClipboard
              title="Copy Result Paths"
              content={result.outputs.map((o) => o.path).join("\n")}
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
