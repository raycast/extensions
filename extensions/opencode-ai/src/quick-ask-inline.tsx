/**
 * Fast Ask - Argument-based command for quick AI queries from root search
 *
 * Usage: Type "Fast Ask <your question>" in Raycast root search
 */

import {
  ActionPanel,
  Action,
  Detail,
  showToast,
  Toast,
  Icon,
  LaunchProps,
  Alert,
  confirmAlert,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { ensureServerRunning, getClient } from "./lib/server";
import { streamPrompt, replyToPermission } from "./hooks/useStreamingPrompt";
import type {
  MessageInfo,
  PermissionRequest,
  PermissionReply,
} from "./lib/types";

interface Arguments {
  prompt: string;
}

interface Preferences {
  defaultModel?: string;
}

// Get model from preference or use fallback
function getDefaultModel(): { providerID: string; modelID: string } {
  const preferences = getPreferenceValues<Preferences>();
  const modelPref = preferences.defaultModel?.trim();

  if (modelPref && modelPref.includes("/")) {
    const [providerID, modelID] = modelPref.split("/");
    return { providerID, modelID };
  }

  // Fallback to Claude Sonnet 4.5
  return {
    providerID: "anthropic",
    modelID: "claude-sonnet-4-5",
  };
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

export default function QuickAskInline(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { prompt } = props.arguments;
  const model = getDefaultModel();

  const [isConnecting, setIsConnecting] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [response, setResponse] = useState<string>("");
  const [messageInfo, setMessageInfo] = useState<MessageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const runQuery = async () => {
      if (!prompt?.trim()) {
        setError("No prompt provided");
        setIsConnecting(false);
        return;
      }

      abortControllerRef.current = new AbortController();

      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Connecting to OpenCode...",
        });

        // Connect to server
        const client = await ensureServerRunning();
        setIsConnecting(false);
        setIsStreaming(true);

        await showToast({
          style: Toast.Style.Animated,
          title: "Asking AI...",
        });

        // Create session for this query
        const sessionResult = await client.session.create({
          title: "Raycast Quick Ask",
        });

        if (!sessionResult.data?.id) {
          throw new Error("Failed to create session");
        }

        const newSessionId = sessionResult.data.id;
        setSessionId(newSessionId);

        // Stream the response
        await streamPrompt({
          sessionId: newSessionId,
          model,
          prompt,
          onDelta: (text) => {
            setResponse(text);
          },
          onComplete: (info) => {
            setMessageInfo(info);
            setIsStreaming(false);
            showToast({
              style: Toast.Style.Success,
              title: "Response received",
            });
          },
          onError: (errorMsg) => {
            throw new Error(errorMsg);
          },
          onPermissionRequest: async (request) => {
            const reply = await showPermissionAlert(request);
            await replyToPermission(request.id, reply);
          },
          signal: abortControllerRef.current.signal,
        });
      } catch (err) {
        if (!abortControllerRef.current?.signal.aborted) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage);
          setIsConnecting(false);
          setIsStreaming(false);
          await showToast({
            style: Toast.Style.Failure,
            title: "Query failed",
            message: errorMessage,
          });
        }
      }
    };

    runQuery();

    // Cleanup on unmount
    return () => {
      abortControllerRef.current?.abort();
      if (sessionId) {
        getClient().then((client) => {
          client.session.delete({ sessionID: sessionId }).catch(() => {
            // Ignore cleanup errors
          });
        });
      }
    };
  }, [prompt]);

  const handleRegenerate = async () => {
    // Clean up old session
    if (sessionId) {
      try {
        const client = await getClient();
        await client.session.delete({ sessionID: sessionId });
      } catch {
        // Ignore cleanup errors
      }
    }

    // Reset state
    setResponse("");
    setMessageInfo(null);
    setError(null);
    setSessionId(null);
    setIsConnecting(true);

    // Re-run the query
    abortControllerRef.current = new AbortController();

    try {
      const client = await ensureServerRunning();
      setIsConnecting(false);
      setIsStreaming(true);

      await showToast({
        style: Toast.Style.Animated,
        title: "Regenerating...",
      });

      const sessionResult = await client.session.create({
        title: "Raycast Quick Ask",
      });

      if (!sessionResult.data?.id) {
        throw new Error("Failed to create session");
      }

      const newSessionId = sessionResult.data.id;
      setSessionId(newSessionId);

      await streamPrompt({
        sessionId: newSessionId,
        model,
        prompt,
        onDelta: (text) => setResponse(text),
        onComplete: (info) => {
          setMessageInfo(info);
          setIsStreaming(false);
          showToast({
            style: Toast.Style.Success,
            title: "Response received",
          });
        },
        onError: (errorMsg) => {
          throw new Error(errorMsg);
        },
        onPermissionRequest: async (request) => {
          const reply = await showPermissionAlert(request);
          await replyToPermission(request.id, reply);
        },
        signal: abortControllerRef.current.signal,
      });
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        setIsStreaming(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Regeneration failed",
          message: errorMessage,
        });
      }
    }
  };

  // Error state
  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}\n\n## Troubleshooting\n\n1. Make sure OpenCode is installed\n2. Ensure you have a provider configured\n3. Check that port 14096 is available`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={handleRegenerate}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Loading/streaming state
  const displayMarkdown =
    response ||
    (isConnecting
      ? "*Connecting to OpenCode...*"
      : "*Waiting for response...*");
  const modelDisplay = `${model.providerID}/${model.modelID}`;

  return (
    <Detail
      markdown={displayMarkdown}
      isLoading={isConnecting || isStreaming}
      navigationTitle={isStreaming ? "Streaming..." : "Fast Ask"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Response"
            content={response}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
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
          <Detail.Metadata.Label title="Model" text={modelDisplay} />
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
            text={prompt.length > 50 ? `${prompt.slice(0, 50)}...` : prompt}
          />
        </Detail.Metadata>
      }
    />
  );
}
