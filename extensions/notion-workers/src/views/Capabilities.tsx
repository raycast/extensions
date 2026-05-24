import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  listCapabilities,
  listWebhooks,
  NtnError,
  streamExecCapability,
  type Capability,
  type StreamHandle,
  type Worker,
} from "../lib/ntn";

export default function CapabilitiesView({ worker }: { worker: Worker }) {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const items = await listCapabilities(worker.workerId);
      setCapabilities(items);
    } catch (err) {
      const message = err instanceof NtnError ? err.message : String(err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to list capabilities",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Capabilities · ${worker.name}`}
      searchBarPlaceholder="Search capabilities"
    >
      {capabilities.map((cap) => (
        <CapabilityItem
          key={`${cap._tag}:${cap.key}`}
          worker={worker}
          capability={cap}
          onRefresh={load}
        />
      ))}
      {!isLoading && capabilities.length === 0 ? (
        <List.EmptyView
          icon={Icon.Wrench}
          title="No capabilities"
          description={`${worker.name} has no registered capabilities.`}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={load}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

function CapabilityItem({
  worker,
  capability,
  onRefresh,
}: {
  worker: Worker;
  capability: Capability;
  onRefresh: () => void;
}) {
  const { push } = useNavigation();

  async function handleCopyWebhookUrl() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Fetching webhook URL for ${capability.key}`,
    });
    try {
      const webhooks = await listWebhooks(worker.workerId);
      const match = webhooks.find((w) => w.key === capability.key);
      if (!match) {
        toast.style = Toast.Style.Failure;
        toast.title = "No webhook URL found";
        toast.message = `No webhook registered for ${capability.key}`;
        return;
      }
      await Clipboard.copy(match.url);
      toast.style = Toast.Style.Success;
      toast.title = "Webhook URL copied";
      toast.message = capability.key;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to fetch webhook URL";
      toast.message = err instanceof NtnError ? err.message : String(err);
    }
  }

  return (
    <List.Item
      icon={Icon.Bolt}
      title={capability.key}
      subtitle={capability._tag}
      actions={
        <ActionPanel>
          <Action
            title="Execute Capability"
            icon={Icon.Play}
            onAction={() =>
              push(<ExecuteForm worker={worker} capability={capability} />)
            }
          />
          {capability._tag === "webhook" ? (
            <Action
              title="Copy Webhook URL"
              icon={Icon.Link}
              onAction={handleCopyWebhookUrl}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Capability Key"
            content={capability.key}
          />
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ExecuteForm({
  worker,
  capability,
}: {
  worker: Worker;
  capability: Capability;
}) {
  const { push } = useNavigation();
  const [input, setInput] = useState("{}");
  const [error, setError] = useState<string | undefined>();

  function handleSubmit() {
    try {
      JSON.parse(input);
    } catch (err) {
      setError(`Invalid JSON: ${(err as Error).message}`);
      return;
    }
    setError(undefined);
    push(
      <StreamingExecuteResult
        worker={worker}
        capability={capability}
        input={input}
      />,
    );
  }

  return (
    <Form
      navigationTitle={`Execute · ${capability.key}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Execute"
            icon={Icon.Play}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Provide JSON input for ${capability.key} on ${worker.name}.`}
      />
      <Form.TextArea
        id="input"
        title="Input (JSON)"
        value={input}
        onChange={setInput}
        error={error}
        enableMarkdown={false}
      />
    </Form>
  );
}

function StreamingExecuteResult({
  worker,
  capability,
  input,
}: {
  worker: Worker;
  capability: Capability;
  input: string;
}) {
  const [output, setOutput] = useState("");
  const [exitCode, setExitCode] = useState<number | null | undefined>(
    undefined,
  );
  const [isRunning, setIsRunning] = useState(true);
  const handleRef = useRef<StreamHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOutput("");
    setExitCode(undefined);
    setIsRunning(true);
    const handle = streamExecCapability(
      worker.workerId,
      capability.key,
      input,
      {
        onChunk: (chunk) => {
          if (cancelled) return;
          setOutput((prev) => prev + chunk);
        },
        onClose: (code) => {
          if (cancelled) return;
          setExitCode(code);
          setIsRunning(false);
        },
        onError: (err) => {
          if (cancelled) return;
          setOutput((prev) => prev + `\n[error] ${err.message}\n`);
          setIsRunning(false);
        },
      },
    );
    handleRef.current = handle;
    return () => {
      cancelled = true;
      handle.cancel();
    };
  }, [worker.workerId, capability.key, input]);

  useEffect(() => {
    if (isRunning) return;
    const title = exitCode === 0 ? "Execution finished" : "Execution failed";
    const style = exitCode === 0 ? Toast.Style.Success : Toast.Style.Failure;
    showToast({ style, title, message: capability.key });
  }, [isRunning, exitCode, capability.key]);

  const statusLine = isRunning
    ? "_Streaming…_"
    : exitCode === 0
      ? "_Finished (exit 0)._"
      : `_Finished with exit code ${exitCode ?? "?"}_`;

  const markdown =
    `### Input\n\n\`\`\`json\n${input}\n\`\`\`\n\n### Output\n\n` +
    (output ? "```\n" + output + "\n```" : "_Waiting for output…_") +
    `\n\n${statusLine}`;

  function handleCancel() {
    handleRef.current?.cancel();
  }

  return (
    <Detail
      isLoading={isRunning}
      navigationTitle={`Result · ${capability.key}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Output" content={output} />
          {isRunning ? (
            <Action
              title="Cancel Execution"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              onAction={handleCancel}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
