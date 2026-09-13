import { WorkspaceAction, WorkspaceMetadata } from "./workspace-command";
import { workspaceTitle } from "../lib/workspaces";
import { Keyboard, Action, ActionPanel, Detail, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useRef, useState } from "react";
import { ExecutorError, resumeExecution } from "../lib/client";
import { pauseFingerprint, readPaused } from "../lib/paused-execution";
import { asJson, codeBlock } from "../lib/format";
import {
  executionFailed,
  executionValue,
  pausedInteraction,
  record,
  resultTable,
  safeBrowserUrl,
} from "../lib/execution";
import type { ExecutionResult, ResumeAction } from "../lib/types";
import { exportResultJson } from "../lib/output-actions";

function ResponseForm({
  schema,
  submit,
}: {
  schema: unknown;
  submit: (content: Record<string, unknown>) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const [text, setText] = useState("{}");
  const [error, setError] = useState<string>();
  const pending = useRef(false);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Response"
            icon={Icon.Check}
            onSubmit={async () => {
              if (pending.current) return;
              let content: Record<string, unknown> | undefined;
              try {
                content = record(JSON.parse(text));
                if (!content) throw new Error("Enter a JSON object.");
              } catch {
                setError("Enter a valid JSON object matching the requested fields.");
                return;
              }
              pending.current = true;
              try {
                if (await submit(content)) pop();
              } finally {
                pending.current = false;
              }
            }}
          />
          <WorkspaceAction />
        </ActionPanel>
      }
    >
      <Form.Description title="Requested Fields" text={asJson(schema)} />
      <Form.TextArea
        id="response"
        title="Response JSON"
        placeholder="JSON object matching the requested fields"
        value={text}
        error={error}
        onChange={(value) => {
          setText(value);
          setError(undefined);
        }}
      />
    </Form>
  );
}

export function ExecutionResultView({
  initial,
  code,
  onResult,
}: {
  initial: ExecutionResult;
  code: string;
  onResult?: (result: ExecutionResult) => void | Promise<unknown>;
}) {
  const [result, setResult] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const pending = useRef(false);
  const paused = pausedInteraction(result);
  const interaction = paused?.interaction;
  const schema = record(interaction?.requestedSchema);
  const needsResponse = schema && Object.keys(schema).length > 0;
  const isUrl = interaction?.kind === "url";
  const isForm = interaction?.kind === "form";
  const url = safeBrowserUrl(interaction?.url);
  const failed = executionFailed(result);
  const value = executionValue(result);

  async function resume(action: ResumeAction, content?: Record<string, unknown>) {
    if (!paused || pending.current || unavailable) return false;
    pending.current = true;
    setBusy(true);
    try {
      const latest = await readPaused(paused.executionId);
      if (latest.fingerprint !== pauseFingerprint(paused.interaction)) {
        setResult({ status: "paused", text: latest.detail.text, structured: latest.detail.structured });
        await showToast({
          style: Toast.Style.Failure,
          title: "Approval Terms Changed",
          message: "Review the updated terms before continuing.",
        });
        // Close any response form that still contains the previous schema and input.
        return true;
      }
      const next = await resumeExecution(paused.executionId, action, content);
      setResult(next);
      // Refreshing an inbox is independent of the already-completed resume request.
      await Promise.resolve()
        .then(() => onResult?.(next))
        .catch(() => undefined);
      await showToast({
        style: executionFailed(next) ? Toast.Style.Failure : Toast.Style.Success,
        title:
          next.status === "paused"
            ? "More Input Required"
            : executionFailed(next)
              ? "Tool Call Failed"
              : "Execution Finished",
      });
      return true;
    } catch (error) {
      if (error instanceof ExecutorError && [404, 410].includes(error.status)) setUnavailable(true);
      await showFailureToast(error, { title: "Could Not Resume Execution" });
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function exportResult() {
    try {
      const exported = await exportResultJson(asJson(value));
      if (!exported.revealed) {
        await showToast({ style: Toast.Style.Success, title: "Result Exported", message: exported.path });
      }
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Export Result" });
    }
  }

  const parts: string[] = [];
  if (result.status === "paused") {
    parts.push(
      `# ${isUrl ? "Continue in Browser" : needsResponse ? "Additional Input Required" : "Approval Required"}`,
      "",
    );
    parts.push(codeBlock(typeof interaction?.message === "string" ? interaction.message : result.text, "text"));
    if (interaction?.address) parts.push("## Tool", codeBlock(String(interaction.address), "text"));
    if (interaction?.args !== undefined) parts.push("## Inputs", codeBlock(asJson(interaction.args)));
    if (interaction?.meta !== undefined) parts.push("## Approval Terms", codeBlock(asJson(interaction.meta)));
    if (!paused || (!isForm && !isUrl))
      parts.push(
        "This interaction cannot be approved here. Its full details are available below.",
        codeBlock(asJson(result.structured)),
      );
    if (unavailable)
      parts.push(
        "This pause is no longer available. No call was retried. Check the upstream system before starting a new run.",
      );
  } else {
    parts.push(failed ? "# Tool Call Failed" : "# Result", "");
    const table = resultTable(value);
    parts.push(table ?? codeBlock(asJson(value) || result.text, "json"));
    const logs = record(result.structured)?.logs;
    if (Array.isArray(logs) && logs.length) parts.push("## Logs", codeBlock(asJson(logs)));
  }

  return (
    <Detail
      isLoading={busy}
      navigationTitle={workspaceTitle(
        result.status === "paused" ? "Execution Paused" : failed ? "Tool Call Failed" : "Tool Result",
      )}
      markdown={parts.join("\n\n")}
      metadata={paused ? <WorkspaceMetadata /> : undefined}
      actions={
        <ActionPanel>
          {paused && !unavailable && !busy ? (
            <ActionPanel.Section title="Approval">
              {isUrl && url ? (
                <Action.OpenInBrowser title="Continue in Browser" shortcut={Keyboard.Shortcut.Common.Open} url={url} />
              ) : null}
              {isForm && needsResponse ? (
                <Action.Push
                  title="Provide Requested Input"
                  icon={Icon.TextInput}
                  target={<ResponseForm schema={schema} submit={(content) => resume("accept", content)} />}
                />
              ) : null}
              {(isForm && !needsResponse) || (isUrl && url) ? (
                <Action
                  title={isUrl ? "Continue After Browser Step" : "Approve Tool Call"}
                  icon={Icon.CheckCircle}
                  onAction={() => resume("accept").catch(() => undefined)}
                />
              ) : null}
              <Action
                title="Decline"
                icon={Icon.XMarkCircle}
                onAction={() => resume("decline").catch(() => undefined)}
              />
              <Action
                title="Cancel Execution"
                icon={Icon.Stop}
                onAction={() => resume("cancel").catch(() => undefined)}
              />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section title="Copy and Export">
            <Action.CopyToClipboard
              title="Copy Result JSON"
              shortcut={Keyboard.Shortcut.Common.Copy}
              content={asJson(value)}
            />
            <Action
              title="Export Result JSON"
              shortcut={Keyboard.Shortcut.Common.Save}
              icon={Icon.Download}
              onAction={exportResult}
            />
            <Action.CopyToClipboard title="Copy Text Output" content={result.text} />
            {code ? <Action.CopyToClipboard title="Copy Code" content={code} /> : null}
            {paused ? <Action.CopyToClipboard title="Copy Execution Identifier" content={paused.executionId} /> : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Inspect">
            <Action.Push
              title="View Full Response"
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              icon={Icon.Code}
              target={<Detail markdown={codeBlock(asJson(result.structured))} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Navigation">
            <WorkspaceAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
