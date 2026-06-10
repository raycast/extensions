import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SHELL_FRESH_MS,
  SHELL_POLL_COALESCE_MS,
  classifyError,
  dispatch,
  fetchThreadSummary,
  nextPollInterval,
} from "./api";
import {
  Device,
  InteractionMode,
  ModelOption,
  ModelSelection,
  RuntimeMode,
  ThreadSummary,
} from "./types";
import {
  T3_CODE_ICON,
  appShortcut,
  compactStatusText,
  fullStatusText,
  t3CodeUrl,
} from "./raycast-ui";

export default function ThreadDetail({
  device,
  initialThread,
  modelOptions,
}: {
  device: Device;
  initialThread: ThreadSummary;
  modelOptions: ModelOption[];
}) {
  const [thread, setThread] = useState<ThreadSummary>(initialThread);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // The form is fully usable from initialThread; fetches only revalidate.
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const retryCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);
  const models = useMemo(
    () => ensureModelOption(modelOptions, thread.modelSelection),
    [modelOptions, thread.modelSelection],
  );

  const doFetch = useCallback(
    async (maxAgeMs = 0) => {
      try {
        const next = await fetchThreadSummary(
          device.baseUrl,
          device.accessToken,
          initialThread.id,
          maxAgeMs,
        );
        if (next) setThread(next);
        setFetchError(null);
        retryCountRef.current = 0;
        return next;
      } catch (err) {
        const classified = classifyError(err);
        setFetchError(classified.message);
        retryCountRef.current += 1;
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [device, initialThread.id],
  );

  const schedulePoll = useCallback(
    (nextThread: ThreadSummary | null) => {
      if (disposedRef.current) return;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      const current = nextThread ?? thread;
      const isRunning = displayState(current).state === "working";
      const interval = nextPollInterval(retryCountRef.current, isRunning);
      pollTimerRef.current = setTimeout(async () => {
        const next = await doFetch(SHELL_POLL_COALESCE_MS);
        schedulePoll(next);
      }, interval);
    },
    [doFetch, thread],
  );

  useEffect(() => {
    void (async () => {
      const next = await doFetch(SHELL_FRESH_MS);
      schedulePoll(next);
    })();
    return () => {
      disposedRef.current = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  async function handleRefresh() {
    retryCountRef.current = 0;
    setIsLoading(true);
    const next = await doFetch();
    schedulePoll(next);
  }

  async function handleStopAgent() {
    try {
      await dispatch(device.baseUrl, device.accessToken, {
        type: "thread.turn.interrupt",
        commandId: crypto.randomUUID(),
        threadId: thread.id,
        createdAt: new Date().toISOString(),
      });
      await showToast(Toast.Style.Success, "Agent stopped");
      void handleRefresh();
    } catch (err) {
      const classified = classifyError(err);
      await showToast(Toast.Style.Failure, classified.message);
    }
  }

  async function handleSendMessage(values: ReplyValues) {
    if (!values.message.trim()) {
      await showToast(Toast.Style.Failure, "Message cannot be empty");
      return;
    }

    const modelSelection = buildModelSelection(values);
    setIsSubmitting(true);
    try {
      const createdAt = new Date().toISOString();
      if (
        modelSelection.instanceId !== thread.modelSelection.instanceId ||
        modelSelection.model !== thread.modelSelection.model ||
        JSON.stringify(modelSelection.options ?? []) !==
          JSON.stringify(thread.modelSelection.options ?? [])
      ) {
        await dispatch(device.baseUrl, device.accessToken, {
          type: "thread.meta.update",
          commandId: crypto.randomUUID(),
          threadId: thread.id,
          modelSelection,
        });
      }
      if (values.runtimeMode !== thread.runtimeMode) {
        await dispatch(device.baseUrl, device.accessToken, {
          type: "thread.runtime-mode.set",
          commandId: crypto.randomUUID(),
          threadId: thread.id,
          runtimeMode: values.runtimeMode,
          createdAt,
        });
      }
      if (values.interactionMode !== thread.interactionMode) {
        await dispatch(device.baseUrl, device.accessToken, {
          type: "thread.interaction-mode.set",
          commandId: crypto.randomUUID(),
          threadId: thread.id,
          interactionMode: values.interactionMode,
          createdAt,
        });
      }
      await dispatch(device.baseUrl, device.accessToken, {
        type: "thread.turn.start",
        commandId: crypto.randomUUID(),
        threadId: thread.id,
        message: {
          messageId: crypto.randomUUID(),
          role: "user",
          text: values.message.trim(),
          attachments: [],
        },
        modelSelection,
        titleSeed: thread.title,
        runtimeMode: values.runtimeMode,
        interactionMode: values.interactionMode,
        createdAt,
      });
      await showToast(Toast.Style.Success, "Message sent");
      void handleRefresh();
    } catch (err) {
      const classified = classifyError(err);
      await showToast(Toast.Style.Failure, classified.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isRunning = displayState(thread).state === "working";
  const statusText = statusSummary(thread, fetchError);
  const statusPreview = compactStatusText(statusText);
  const defaultOptions = optionMap(thread.modelSelection);
  const defaultEffort = stringOption(defaultOptions.get("effort"), "high");
  const defaultContextWindow = stringOption(
    defaultOptions.get("contextWindow"),
    "1M",
  );
  const defaultFastMode = booleanOption(defaultOptions.get("fastMode"), false);

  return (
    <Form
      navigationTitle={thread.title}
      isLoading={isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isRunning ? (
              <Action
                title="Stop Agent"
                icon={Icon.Stop}
                shortcut={appShortcut(".")}
                onAction={() => void handleStopAgent()}
              />
            ) : (
              <Action.SubmitForm
                title="Send Message"
                icon={Icon.Message}
                shortcut={appShortcut("return")}
                onSubmit={(values: ReplyValues) =>
                  void handleSendMessage(values)
                }
              />
            )}
            <Action
              title="Refresh"
              icon={Icon.RotateClockwise}
              shortcut={appShortcut("r")}
              onAction={() => void handleRefresh()}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="View Full Status"
              icon={Icon.Text}
              shortcut={appShortcut("i")}
              target={<StatusDetail thread={thread} statusText={statusText} />}
            />
            <Action.OpenInBrowser
              title="Open in T3 Code"
              icon={T3_CODE_ICON}
              url={t3CodeUrl(device, thread)}
              shortcut={appShortcut("o")}
            />
            <Action.CopyToClipboard
              title="Copy Thread ID"
              content={thread.id}
              shortcut={appShortcut("c", ["shift"])}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description title="Status" text={statusPreview} />
      <Form.Description
        title="Thread"
        text={`${thread.title}${thread.branch ? `  |  ${thread.branch}` : ""}`}
      />

      {!isRunning && (
        <>
          <Form.Separator />
          <Form.TextArea
            id="message"
            title="Message"
            placeholder="Describe the next task for this agent..."
          />
          <Form.Dropdown
            id="modelKey"
            title="Model"
            defaultValue={modelKey(thread.modelSelection)}
          >
            {models.map((model) => (
              <Form.Dropdown.Item
                key={model.key}
                value={model.key}
                title={model.label}
                icon={Icon.ComputerChip}
              />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="runtimeMode"
            title="Runtime"
            defaultValue={thread.runtimeMode}
          >
            <Form.Dropdown.Item
              value="approval-required"
              title="Approve Actions"
            />
            <Form.Dropdown.Item
              value="auto-accept-edits"
              title="Auto-Accept Edits"
            />
            <Form.Dropdown.Item value="full-access" title="Full Access" />
          </Form.Dropdown>
          <Form.Dropdown
            id="interactionMode"
            title="Interaction"
            defaultValue={thread.interactionMode}
          >
            <Form.Dropdown.Item value="default" title="Default" />
            <Form.Dropdown.Item value="plan" title="Plan" />
          </Form.Dropdown>
          <Form.Separator />
          <Form.Dropdown
            id="effort"
            title="Effort"
            defaultValue={defaultEffort}
          >
            <Form.Dropdown.Item value="low" title="Low" />
            <Form.Dropdown.Item value="medium" title="Medium" />
            <Form.Dropdown.Item value="high" title="High" />
          </Form.Dropdown>
          <Form.Dropdown
            id="contextWindow"
            title="Context"
            defaultValue={defaultContextWindow}
          >
            <Form.Dropdown.Item value="200k" title="200k" />
            <Form.Dropdown.Item value="1M" title="1M" />
          </Form.Dropdown>
          <Form.Dropdown
            id="fastMode"
            title="Fast Mode"
            defaultValue={defaultFastMode}
          >
            <Form.Dropdown.Item value="false" title="Off" />
            <Form.Dropdown.Item value="true" title="On" />
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}

function StatusDetail({
  thread,
  statusText,
}: {
  thread: ThreadSummary;
  statusText: string;
}) {
  return (
    <Detail
      navigationTitle="Thread Status"
      markdown={`# ${thread.title}\n\n${statusText
        .split("\n")
        .map((line) => `    ${line}`)
        .join("\n")}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Status"
            content={statusText}
            shortcut={appShortcut("c", ["shift"])}
          />
        </ActionPanel>
      }
    />
  );
}

interface ReplyValues {
  message: string;
  modelKey: string;
  effort: string;
  runtimeMode: RuntimeMode;
  interactionMode: InteractionMode;
  contextWindow: string;
  fastMode: string;
}

function buildModelSelection(values: ReplyValues): ModelSelection {
  const [instanceId, model] = values.modelKey.split("::");
  const options: ModelSelection["options"] = [];
  if (values.effort) options.push({ id: "effort", value: values.effort });
  if (values.contextWindow) {
    options.push({ id: "contextWindow", value: values.contextWindow });
  }
  if (values.fastMode) {
    options.push({ id: "fastMode", value: values.fastMode === "true" });
  }
  return {
    instanceId,
    model,
    options,
  };
}

function statusSummary(
  thread: ThreadSummary,
  fetchError: string | null,
): string {
  const { label } = statusDisplay(thread);
  return fullStatusText(thread, label, timeAgo(thread.updatedAt), fetchError);
}

function ensureModelOption(
  options: ModelOption[],
  current: ModelSelection,
): ModelOption[] {
  const key = modelKey(current);
  if (options.some((option) => option.key === key)) return options;
  return [
    {
      key,
      instanceId: current.instanceId,
      model: current.model,
      label: current.model,
      providerLabel: current.instanceId,
    },
    ...options,
  ];
}

function optionMap(
  modelSelection: ModelSelection,
): Map<string, string | boolean> {
  return new Map(
    modelSelection.options?.map((option) => [option.id, option.value]),
  );
}

function stringOption(
  value: string | boolean | undefined,
  fallback: string,
): string {
  return typeof value === "string" && value ? value : fallback;
}

function booleanOption(
  value: string | boolean | undefined,
  fallback: boolean,
): string {
  return String(typeof value === "boolean" ? value : fallback);
}

function modelKey(selection: ModelSelection): string {
  return `${selection.instanceId}::${selection.model}`;
}

function displayState(thread: ThreadSummary): {
  state: "idle" | "working" | "error" | "complete" | "stopped";
} {
  if (
    thread.sessionStatus === "error" ||
    thread.latestTurnState === "error" ||
    thread.sessionLastError
  ) {
    return { state: "error" };
  }
  if (
    thread.sessionStatus === "running" ||
    thread.sessionStatus === "starting" ||
    thread.latestTurnState === "running"
  ) {
    return { state: "working" };
  }
  if (
    thread.sessionStatus === "ready" ||
    thread.latestTurnState === "completed"
  ) {
    return { state: "complete" };
  }
  if (
    thread.sessionStatus === "interrupted" ||
    thread.sessionStatus === "stopped" ||
    thread.latestTurnState === "interrupted"
  ) {
    return { state: "stopped" };
  }
  return { state: "idle" };
}

function statusDisplay(thread: ThreadSummary): { color: Color; label: string } {
  switch (displayState(thread).state) {
    case "working":
      return { color: Color.Orange, label: "Working" };
    case "error":
      return { color: Color.Red, label: "Error" };
    case "complete":
      return { color: Color.Green, label: "Complete" };
    case "stopped":
      return { color: Color.Yellow, label: "Stopped" };
    case "idle":
      return { color: Color.SecondaryText, label: "Idle" };
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
