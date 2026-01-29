/**
 * Hook for streaming AI responses from OpenCode
 */

import { useState, useEffect, useRef } from "react";
import remend from "remend";
import type {
  MessageInfo,
  PermissionRequest,
  PermissionReply,
} from "../lib/types";
import { getClient } from "../lib/server";

/**
 * Reply to a permission request
 */
export async function replyToPermission(
  requestId: string,
  reply: PermissionReply,
): Promise<void> {
  const client = await getClient();
  await client.permission.reply({
    requestID: requestId,
    reply,
  });
}

interface UseStreamingPromptOptions {
  sessionId: string;
  model: { providerID: string; modelID: string };
  prompt: string;
  enabled?: boolean;
}

interface UseStreamingPromptResult {
  streamedText: string;
  isStreaming: boolean;
  isComplete: boolean;
  error: string | null;
  messageInfo: MessageInfo | null;
}

/**
 * Hook that sends a prompt and streams the response via SSE events
 *
 * Handles multi-step responses where the AI may call tools and continue
 * generating text. Uses `session.idle` as the completion signal.
 */
export function useStreamingPrompt({
  sessionId,
  model,
  prompt,
  enabled = true,
}: UseStreamingPromptOptions): UseStreamingPromptResult {
  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageInfo, setMessageInfo] = useState<MessageInfo | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedTextRef = useRef<string>("");
  const totalTokensRef = useRef({
    input: 0,
    output: 0,
    reasoning: 0,
    cache: { read: 0, write: 0 },
  });
  const totalCostRef = useRef(0);
  const lastMessageIdRef = useRef("");
  const userMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !sessionId || !prompt) {
      return;
    }

    const runStream = async () => {
      // Reset state
      setStreamedText("");
      setIsStreaming(true);
      setIsComplete(false);
      setError(null);
      setMessageInfo(null);
      startTimeRef.current = Date.now();
      accumulatedTextRef.current = "";
      totalTokensRef.current = {
        input: 0,
        output: 0,
        reasoning: 0,
        cache: { read: 0, write: 0 },
      };
      totalCostRef.current = 0;
      lastMessageIdRef.current = "";
      userMessageIdsRef.current = new Set();

      // Create abort controller for cleanup
      abortControllerRef.current = new AbortController();

      try {
        const client = await getClient();

        // Start the prompt asynchronously
        const promptResult = await client.session.promptAsync({
          sessionID: sessionId,
          model,
          parts: [{ type: "text", text: prompt }],
        });

        if (promptResult.error) {
          throw new Error(
            `Failed to send prompt: ${JSON.stringify(promptResult.error)}`,
          );
        }

        // Subscribe to events
        const eventStream = await client.event.subscribe({});

        // Process events from the stream
        for await (const event of eventStream.stream) {
          // Check if aborted
          if (abortControllerRef.current?.signal.aborted) {
            break;
          }

          // Type guard for event structure
          if (!event || typeof event !== "object" || !("type" in event)) {
            continue;
          }

          const typedEvent = event as {
            type: string;
            properties?: Record<string, unknown>;
          };

          // Handle session idle - this means we're done with all steps
          if (typedEvent.type === "session.idle") {
            const idleProps = typedEvent.properties as { sessionID: string };
            if (idleProps.sessionID === sessionId) {
              const endTime = Date.now();
              setMessageInfo({
                messageId: lastMessageIdRef.current,
                sessionId: sessionId,
                tokens: { ...totalTokensRef.current },
                cost: totalCostRef.current,
                timeMs: endTime - startTimeRef.current,
                modelId: model.modelID,
                providerId: model.providerID,
              });
              setIsComplete(true);
              setIsStreaming(false);
              break;
            }
            continue;
          }

          // Handle message updates to identify user messages
          if (typedEvent.type === "message.updated") {
            const msgProps = typedEvent.properties as {
              sessionID?: string;
              id?: string;
              role?: string;
            };
            if (
              msgProps.sessionID === sessionId &&
              msgProps.role === "user" &&
              msgProps.id
            ) {
              userMessageIdsRef.current.add(msgProps.id);
            }
            continue;
          }

          // Filter for events related to our session
          if (typedEvent.type === "message.part.updated") {
            const props = typedEvent.properties as {
              part?: {
                type: string;
                sessionID?: string;
                messageID?: string;
                text?: string;
                cost?: number;
                tokens?: {
                  input: number;
                  output: number;
                  reasoning: number;
                  cache: { read: number; write: number };
                };
              };
              delta?: string;
            };

            const part = props?.part;
            if (!part || part.sessionID !== sessionId) {
              continue;
            }

            // Skip text parts from user messages
            if (
              part.messageID &&
              userMessageIdsRef.current.has(part.messageID)
            ) {
              continue;
            }

            // Track the latest assistant message ID
            if (part.messageID) {
              lastMessageIdRef.current = part.messageID;
            }

            if (part.type === "text" && props.delta) {
              // Accumulate streamed text and fix incomplete markdown
              accumulatedTextRef.current += props.delta;
              setStreamedText(remend(accumulatedTextRef.current));
            } else if (part.type === "step-finish") {
              // Aggregate stats from each step (don't break - wait for session.idle)
              if (part.tokens) {
                totalTokensRef.current.input += part.tokens.input;
                totalTokensRef.current.output += part.tokens.output;
                totalTokensRef.current.reasoning += part.tokens.reasoning;
                totalTokensRef.current.cache.read += part.tokens.cache.read;
                totalTokensRef.current.cache.write += part.tokens.cache.write;
              }
              if (part.cost) {
                totalCostRef.current += part.cost;
              }
            }
          }
        }
      } catch (err) {
        if (!abortControllerRef.current?.signal.aborted) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage);
          setIsStreaming(false);
        }
      }
    };

    runStream();

    // Cleanup on unmount or when dependencies change
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [sessionId, model.providerID, model.modelID, prompt, enabled]);

  return {
    streamedText,
    isStreaming,
    isComplete,
    error,
    messageInfo,
  };
}

/**
 * Options for streamPrompt
 */
export interface StreamPromptOptions {
  sessionId: string;
  model: { providerID: string; modelID: string };
  prompt: string;
  onDelta: (text: string) => void;
  onComplete: (info: MessageInfo) => void;
  onError: (error: string) => void;
  onPermissionRequest?: (request: PermissionRequest) => void;
  signal?: AbortSignal;
}

/**
 * Imperative version for use outside of React components
 *
 * This handles multi-step responses where the AI may:
 * 1. Generate text
 * 2. Call tools (requiring permission)
 * 3. Generate more text based on tool results
 * 4. Repeat until done
 *
 * We use `session.idle` as the completion signal, not `step-finish`,
 * because there can be multiple steps in a single response.
 */
export async function streamPrompt(
  options: StreamPromptOptions,
): Promise<void> {
  const {
    sessionId,
    model,
    prompt,
    onDelta,
    onComplete,
    onError,
    onPermissionRequest,
    signal,
  } = options;

  const startTime = Date.now();
  let accumulatedText = "";

  // Track aggregated stats across all steps
  const totalTokens = {
    input: 0,
    output: 0,
    reasoning: 0,
    cache: { read: 0, write: 0 },
  };
  let totalCost = 0;
  let lastMessageId = "";

  // Track which messages are from the user (to skip their text parts)
  const userMessageIds = new Set<string>();

  try {
    const client = await getClient();

    // Start the prompt asynchronously
    const promptResult = await client.session.promptAsync({
      sessionID: sessionId,
      model,
      parts: [{ type: "text", text: prompt }],
    });

    if (promptResult.error) {
      throw new Error(
        `Failed to send prompt: ${JSON.stringify(promptResult.error)}`,
      );
    }

    // Subscribe to events
    const eventStream = await client.event.subscribe({});

    // Process events from the stream
    for await (const event of eventStream.stream) {
      if (signal?.aborted) {
        break;
      }

      if (!event || typeof event !== "object" || !("type" in event)) {
        continue;
      }

      const typedEvent = event as {
        type: string;
        properties?: Record<string, unknown>;
      };

      // Handle session idle - this means we're done with all steps
      if (typedEvent.type === "session.idle") {
        const idleProps = typedEvent.properties as { sessionID: string };
        if (idleProps.sessionID === sessionId) {
          const endTime = Date.now();
          onComplete({
            messageId: lastMessageId,
            sessionId: sessionId,
            tokens: totalTokens,
            cost: totalCost,
            timeMs: endTime - startTime,
            modelId: model.modelID,
            providerId: model.providerID,
          });
          break;
        }
        continue;
      }

      // Handle permission requests
      if (typedEvent.type === "permission.asked") {
        const permProps = typedEvent.properties as PermissionRequest;
        if (permProps.sessionID === sessionId && onPermissionRequest) {
          onPermissionRequest(permProps);
        }
        continue;
      }

      // Handle message updates to identify user messages
      if (typedEvent.type === "message.updated") {
        const msgProps = typedEvent.properties as {
          sessionID?: string;
          id?: string;
          role?: string;
        };
        if (
          msgProps.sessionID === sessionId &&
          msgProps.role === "user" &&
          msgProps.id
        ) {
          userMessageIds.add(msgProps.id);
        }
        continue;
      }

      if (typedEvent.type === "message.part.updated") {
        const props = typedEvent.properties as {
          part?: {
            type: string;
            sessionID?: string;
            messageID?: string;
            text?: string;
            cost?: number;
            tokens?: {
              input: number;
              output: number;
              reasoning: number;
              cache: { read: number; write: number };
            };
          };
          delta?: string;
        };

        const part = props?.part;
        if (!part || part.sessionID !== sessionId) {
          continue;
        }

        // Skip text parts from user messages
        if (part.messageID && userMessageIds.has(part.messageID)) {
          continue;
        }

        // Track the latest assistant message ID
        if (part.messageID) {
          lastMessageId = part.messageID;
        }

        if (part.type === "text" && props.delta) {
          // Accumulate text from all assistant messages
          accumulatedText += props.delta;
          onDelta(remend(accumulatedText));
        } else if (part.type === "step-finish") {
          // Aggregate stats from each step (don't break - wait for session.idle)
          if (part.tokens) {
            totalTokens.input += part.tokens.input;
            totalTokens.output += part.tokens.output;
            totalTokens.reasoning += part.tokens.reasoning;
            totalTokens.cache.read += part.tokens.cache.read;
            totalTokens.cache.write += part.tokens.cache.write;
          }
          if (part.cost) {
            totalCost += part.cost;
          }
        }
      }
    }
  } catch (err) {
    if (!signal?.aborted) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      onError(errorMessage);
    }
  }
}
