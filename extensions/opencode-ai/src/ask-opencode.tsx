/**
 * Ask OpenCode - Main command for querying AI through OpenCode
 */

import {
  Form,
  ActionPanel,
  Action,
  Detail,
  showToast,
  Toast,
  Icon,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { useState, useCallback, useRef, useEffect } from "react";
import { useOpenCodeServer } from "./hooks/useOpenCodeServer";
import { streamPrompt, replyToPermission } from "./hooks/useStreamingPrompt";
import type {
  MessageInfo,
  PermissionRequest,
  PermissionReply,
} from "./lib/types";

interface FormValues {
  prompt: string;
  model: string;
}

function formatTokens(tokens: MessageInfo["tokens"]): string {
  const parts = [`In: ${tokens.input}`, `Out: ${tokens.output}`];
  if (tokens.cache.read > 0 || tokens.cache.write > 0) {
    parts.push(`Cache: ${tokens.cache.read}r/${tokens.cache.write}w`);
  }
  return parts.join(" | ");
}

function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

function formatTokensPerSecond(tokens: number, ms: number): string {
  if (ms <= 0) return "N/A";
  const tps = (tokens / ms) * 1000;
  return `${tps.toFixed(1)} tok/s`;
}

/**
 * Format a permission request into a human-readable description
 */
function formatPermissionMessage(request: PermissionRequest): string {
  const { permission, patterns, metadata } = request;

  // Build a description based on the permission type
  switch (permission) {
    case "edit":
      return `Edit file: ${patterns.join(", ")}`;
    case "bash":
      if (metadata.command) {
        return `Run command: ${metadata.command}`;
      }
      return `Run shell command in: ${patterns.join(", ")}`;
    case "write":
      return `Write to file: ${patterns.join(", ")}`;
    case "read":
      return `Read file: ${patterns.join(", ")}`;
    case "webfetch":
      return `Fetch URL: ${patterns.join(", ")}`;
    default:
      return `${permission}: ${patterns.join(", ")}`;
  }
}

/**
 * Show a confirmation dialog for a permission request.
 * Always returns "once" or "reject" since each message creates a new session.
 */
async function showPermissionAlert(
  request: PermissionRequest,
): Promise<PermissionReply> {
  const message = formatPermissionMessage(request);

  const options: Alert.Options = {
    title: "Permission Required",
    message,
    icon: Icon.Shield,
    primaryAction: {
      title: "Allow",
      style: Alert.ActionStyle.Default,
    },
    dismissAction: {
      title: "Deny",
      style: Alert.ActionStyle.Cancel,
    },
  };

  const confirmed = await confirmAlert(options);

  // Always use "once" since each message is a new session
  return confirmed ? "once" : "reject";
}

export default function AskOpenCode() {
  const {
    isLoading,
    isConnected,
    error,
    modelGroups,
    defaultModel,
    client,
    reconnect,
  } = useOpenCodeServer();

  const [isQuerying, setIsQuerying] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [messageInfo, setMessageInfo] = useState<MessageInfo | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [lastModel, setLastModel] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      if (sessionId && client) {
        client.session.delete({ sessionID: sessionId }).catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [sessionId, client]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      if (!client) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Not connected",
          message: "Please wait for OpenCode to connect",
        });
        return;
      }

      if (!values.prompt.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Empty prompt",
          message: "Please enter a prompt",
        });
        return;
      }

      // Abort any existing stream
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsQuerying(true);
      setIsStreaming(true);
      setResponse("");
      setMessageInfo(null);
      setLastPrompt(values.prompt);
      setLastModel(values.model);

      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Asking OpenCode...",
        });

        // Create a session for this query
        const sessionResult = await client.session.create({
          title: "Raycast Query",
        });

        if (!sessionResult.data?.id) {
          throw new Error("Failed to create session");
        }

        const newSessionId = sessionResult.data.id;
        setSessionId(newSessionId);

        // Parse model ID (format: "providerId/modelId")
        const [providerID, modelID] = values.model.split("/");

        // Stream the response
        await streamPrompt({
          sessionId: newSessionId,
          model: { providerID, modelID },
          prompt: values.prompt,
          // onDelta - update response as text streams in
          onDelta: (text) => {
            setResponse(text);
          },
          // onComplete - capture final stats
          onComplete: (info) => {
            setMessageInfo(info);
            setIsStreaming(false);
            showToast({
              style: Toast.Style.Success,
              title: "Response received",
            });
          },
          // onError
          onError: (errorMsg) => {
            throw new Error(errorMsg);
          },
          // onPermissionRequest - handle tool confirmations
          onPermissionRequest: async (request) => {
            const reply = await showPermissionAlert(request);
            await replyToPermission(request.id, reply);
          },
          signal: abortControllerRef.current.signal,
        });
      } catch (err) {
        if (!abortControllerRef.current?.signal.aborted) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setResponse(null);
          await showToast({
            style: Toast.Style.Failure,
            title: "Query failed",
            message: errorMessage,
          });
        }
      } finally {
        setIsQuerying(false);
        setIsStreaming(false);
      }
    },
    [client],
  );

  const handleRegenerate = useCallback(async () => {
    if (lastPrompt && lastModel) {
      // Clean up old session
      if (sessionId && client) {
        try {
          await client.session.delete({ sessionID: sessionId });
        } catch {
          // Ignore cleanup errors
        }
        setSessionId(null);
      }
      await handleSubmit({ prompt: lastPrompt, model: lastModel });
    }
  }, [lastPrompt, lastModel, sessionId, client, handleSubmit]);

  const handleNewQuery = useCallback(async () => {
    // Abort any existing stream
    abortControllerRef.current?.abort();

    // Clean up session
    if (sessionId && client) {
      try {
        await client.session.delete({ sessionID: sessionId });
      } catch {
        // Ignore cleanup errors
      }
    }

    setResponse(null);
    setMessageInfo(null);
    setSessionId(null);
  }, [sessionId, client]);

  // Show response view (streaming or complete)
  if (response !== null) {
    const displayMarkdown =
      response ||
      (isStreaming ? "*Waiting for response...*" : "No response received");

    return (
      <Detail
        markdown={displayMarkdown}
        isLoading={isStreaming}
        navigationTitle={isStreaming ? "Streaming..." : "OpenCode Response"}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Response"
              content={response}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="New Query"
              icon={Icon.Plus}
              onAction={handleNewQuery}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title="Regenerate"
              icon={Icon.ArrowClockwise}
              onAction={handleRegenerate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Model" text={lastModel} />
            <Detail.Metadata.Separator />
            {messageInfo && (
              <>
                <Detail.Metadata.Label
                  title="Tokens"
                  text={formatTokens(messageInfo.tokens)}
                />
                <Detail.Metadata.Label
                  title="Speed"
                  text={formatTokensPerSecond(
                    messageInfo.tokens.output,
                    messageInfo.timeMs,
                  )}
                />
                <Detail.Metadata.Label
                  title="Time"
                  text={formatTime(messageInfo.timeMs)}
                />
                <Detail.Metadata.Label
                  title="Cost"
                  text={formatCost(messageInfo.cost)}
                />
                <Detail.Metadata.Separator />
              </>
            )}
            <Detail.Metadata.Label
              title="Prompt"
              text={
                lastPrompt.length > 50
                  ? `${lastPrompt.slice(0, 50)}...`
                  : lastPrompt
              }
            />
          </Detail.Metadata>
        }
      />
    );
  }

  // Show error state
  if (error && !isLoading) {
    return (
      <Detail
        markdown={`# Connection Error\n\n${error}\n\n## Troubleshooting\n\n1. Make sure OpenCode is installed: \`npm install -g opencode-ai\`\n2. Ensure you have at least one provider configured: run \`opencode\` and use \`/connect\`\n3. Check that port 14096 is available`}
        actions={
          <ActionPanel>
            <Action
              title="Retry Connection"
              icon={Icon.ArrowClockwise}
              onAction={reconnect}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Show input form
  return (
    <Form
      isLoading={isLoading || isQuerying}
      navigationTitle="Ask OpenCode"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask"
            icon={Icon.Message}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Ask anything..."
        autoFocus
        enableMarkdown
      />

      {isConnected && modelGroups.length > 0 && (
        <Form.Dropdown
          id="model"
          title="Model"
          defaultValue={defaultModel}
          storeValue
        >
          {modelGroups.map((group) => (
            <Form.Dropdown.Section
              key={group.providerId}
              title={group.providerName}
            >
              {group.models.map((m) => (
                <Form.Dropdown.Item key={m.id} value={m.id} title={m.name} />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>
      )}

      {isConnected && modelGroups.length === 0 && (
        <Form.Description
          title="No Models Available"
          text="No AI providers are configured. Run `opencode` and use `/connect` to add a provider."
        />
      )}
    </Form>
  );
}
