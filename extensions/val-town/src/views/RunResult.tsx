import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { runFile } from "../lib/api";
import { errorMessage, formatDuration } from "../lib/format";

type Props =
  | { mode: "run"; val: string; path: string; branch: string }
  | { mode: "fetch"; val: string; path: string; endpoint: string };

export function RunResult(props: Props) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (mode: Props["mode"], val: string, path: string, target: string) =>
      mode === "run" ? runOnce(val, path, target) : fetchOnce(target),
    [props.mode, props.val, props.path, props.mode === "run" ? props.branch : props.endpoint],
    { keepPreviousData: false },
  );

  const markdown = error ? `## Failed\n\n\`\`\`\n${errorMessage(error)}\n\`\`\`` : (data?.markdown ?? "Running…");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${props.val} / ${props.path}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Run Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
          {data?.copyable ? <Action.CopyToClipboard title="Copy Output" content={data.copyable} /> : null}
          {props.mode === "fetch" ? <Action.OpenInBrowser title="Open Endpoint" url={props.endpoint} /> : null}
        </ActionPanel>
      }
    />
  );
}

async function runOnce(val: string, path: string, branch: string) {
  const startedAt = Date.now();
  const result = await runFile(val, path, { branch });
  const elapsed = formatDuration(Date.now() - startedAt);
  const failed = result.type === "error";

  const body = failed
    ? [result.message, result.stack].filter(Boolean).join("\n")
    : JSON.stringify(result.value ?? result, null, 2);

  const logs = (result.logs ?? []).map((line) => `[${line.level}] ${line.log}`).join("\n");

  return {
    copyable: body,
    markdown: [
      `## ${failed ? "Error" : "Result"} · ${elapsed}`,
      "```json",
      body,
      "```",
      logs ? `### Logs\n\n\`\`\`\n${logs}\n\`\`\`` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

async function fetchOnce(endpoint: string) {
  const startedAt = Date.now();
  const response = await fetch(endpoint, { redirect: "manual" });
  const elapsed = formatDuration(Date.now() - startedAt);
  const body = await response.text();

  if (response.status >= 300 && response.status < 400) {
    return {
      copyable: undefined,
      markdown: `## Restricted\n\nThis val's HTTP access is restricted, so the endpoint redirected to a login page instead of answering.`,
    };
  }

  return {
    copyable: body,
    markdown: [`## ${response.status} ${response.statusText} · ${elapsed}`, "```", body.slice(0, 20000), "```"].join(
      "\n\n",
    ),
  };
}
