import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getConfig } from "./api";
import { ConversationView } from "./conversation";
import {
  ApprovalChoice,
  ApprovalRequest,
  resolveApproval,
  stopRun,
  submitRun,
  subscribeRunEvents,
} from "./hermes-client";

interface ToolEntry {
  name: string;
  state: "running" | "done" | "failed";
  preview?: string;
  duration?: number;
}

function RunView({ task }: { task: string }) {
  const config = useMemo(() => getConfig(), []);
  const [output, setOutput] = useState("");
  const [tools, setTools] = useState<ToolEntry[]>([]);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const runIdRef = useRef<string | null>(null);
  const buffer = useRef("");
  const lastUpdate = useRef(0);

  const run = useCallback(async () => {
    try {
      const submitted = await submitRun(config, task);
      runIdRef.current = submitted.run_id;

      const result = await subscribeRunEvents(config, submitted.run_id, {
        onDelta: (delta) => {
          buffer.current += delta;
          const now = Date.now();
          if (now - lastUpdate.current > 100) {
            lastUpdate.current = now;
            setOutput(buffer.current);
          }
        },
        onToolStarted: (name, preview) => {
          setTools((prev) => [...prev, { name, state: "running", preview }]);
        },
        onToolCompleted: (name, duration, toolError) => {
          setTools((prev) =>
            prev.map((t) =>
              t.name === name && t.state === "running"
                ? {
                    ...t,
                    state: toolError ? "failed" : "done",
                    duration,
                  }
                : t,
            ),
          );
        },
        onApproval: (req) => {
          setApproval(req);
        },
        onCompleted: (finalOutput) => {
          setOutput(finalOutput || buffer.current);
          setCompleted(true);
        },
        onFailed: (err) => {
          setError(err);
        },
      });

      if (result.output) {
        setOutput(result.output);
      }
      if (result.error) {
        setError(result.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRunning(false);
    }
  }, [config, task]);

  useEffect(() => {
    run();
  }, [run]);

  const handleApproval = useCallback(
    async (choice: ApprovalChoice) => {
      if (!runIdRef.current || !approval) return;
      try {
        await resolveApproval(config, runIdRef.current, choice);
        setApproval(null);
        showToast({
          style: Toast.Style.Success,
          title: choice === "deny" ? "Denied" : `Approved ${choice}`,
        });
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Approval failed",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [config, approval],
  );

  const handleStop = useCallback(async () => {
    if (!runIdRef.current) return;
    try {
      await stopRun(config, runIdRef.current);
      showToast({ style: Toast.Style.Success, title: "Run stopped" });
      setIsRunning(false);
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Stop failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }, [config]);

  const markdown = useMemo(() => {
    const parts: string[] = [];
    if (error) {
      parts.push(`## Error\n\n${error}`);
    }
    if (approval) {
      parts.push(
        `## Approval Required\n\nHermes wants to run:\n\n\`\`\`\n${approval.command}\n\`\`\`\n\nChoose an action below.`,
      );
    }
    if (tools.length > 0) {
      const toolLines = tools
        .map((t) => {
          const icon =
            t.state === "running"
              ? "running"
              : t.state === "failed"
                ? "failed"
                : "done";
          const dur = t.duration ? ` (${t.duration}s)` : "";
          const prev = t.preview ? ` — ${t.preview.slice(0, 80)}` : "";
          return `- \`${t.name}\` ${icon}${dur}${prev}`;
        })
        .join("\n");
      parts.push(`## Tool Activity\n\n${toolLines}`);
    }
    if (output) {
      parts.push(`## Output\n\n${output}`);
    }
    if (!output && !error && !approval && tools.length === 0) {
      parts.push("*Starting run…*");
    }
    return parts.join("\n\n---\n\n");
  }, [output, tools, error, approval]);

  return (
    <Detail
      isLoading={isRunning && !output && tools.length === 0}
      markdown={markdown}
      actions={
        <ActionPanel>
          {approval && (
            <>
              <Action
                title="Approve Once"
                icon={Icon.Checkmark}
                style={Action.Style.Regular}
                onAction={() => handleApproval("once")}
              />
              {approval.choices.includes("session") && (
                <Action
                  title="Approve for Session"
                  icon={Icon.Checkmark}
                  onAction={() => handleApproval("session")}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
              )}
              {approval.choices.includes("always") && (
                <Action
                  title="Always Allow"
                  icon={Icon.Checkmark}
                  onAction={() => handleApproval("always")}
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
                />
              )}
              <Action
                title="Deny"
                icon={Icon.Xmark}
                style={Action.Style.Destructive}
                onAction={() => handleApproval("deny")}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </>
          )}
          {isRunning && !approval && (
            <Action
              title="Stop Run"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              onAction={handleStop}
            />
          )}
          {completed && output && (
            <>
              <Action.CopyToClipboard title="Copy Output" content={output} />
              <Action.Push
                title="Continue in Chat"
                icon={Icon.Message}
                shortcut={{ modifiers: ["cmd"], key: "j" }}
                target={
                  <ConversationView
                    sessionId={runIdRef.current || undefined}
                    sessionTitle={task.slice(0, 50)}
                  />
                }
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [task, setTask] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  async function handleSubmit() {
    if (!task.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Enter a task" });
      return;
    }
    setSubmitted(task.trim());
  }

  if (submitted) {
    return <RunView task={submitted} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="task"
        title="Task"
        placeholder="Describe what you want Hermes to do…"
        value={task}
        onChange={setTask}
        autoFocus
      />
    </Form>
  );
}
