/**
 * Chat Hook
 *
 * Encapsulates the "send message to agent and get response" logic.
 *
 * Streaming modes (from Letta docs):
 * - Step Streaming (default): Returns complete messages after each step
 * - Token Streaming (stream_tokens: true): Returns partial chunks, accumulate by message ID
 */

import { useState, useCallback, useEffect } from "react";
import type { Letta } from "@letta-ai/letta-client";

export type ToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
  toolCallId?: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

/**
 * Parse tool call arguments from string to object
 */
function parseToolArguments(args: unknown): Record<string, unknown> | undefined {
  if (!args) return undefined;
  if (typeof args === "object") return args as Record<string, unknown>;
  if (typeof args === "string") {
    try {
      return JSON.parse(args);
    } catch {
      return { raw: args };
    }
  }
  return undefined;
}

/**
 * Extract text content from AssistantMessage content field
 * Content can be: string | array of {text, signature?, type?: "text"}
 */
function extractAssistantContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const block of content) {
      if (typeof block === "string") {
        texts.push(block);
      } else if (typeof block === "object" && block !== null && "text" in block) {
        texts.push((block as { text: string }).text);
      }
    }
    return texts.join("");
  }
  return "";
}

export function useChat(client: Letta, agentId?: string | null, initialMessages?: ChatMessage[]) {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
  const [currentAnswer, setCurrentAnswer] = useState<string>("");
  const [currentReasoning, setCurrentReasoning] = useState<string>("");
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize messages if provided and different from current
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  const send = useCallback(
    async (userInput: string) => {
      if (!agentId) {
        setError("No active Letta agent selected.");
        return;
      }

      // Add user message to history
      const userMessage: ChatMessage = {
        role: "user",
        content: userInput,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      setIsLoading(true);
      setError(null);
      setCurrentAnswer("");
      setCurrentReasoning("");
      setToolCalls([]);

      let finalAnswer = "";
      let finalReasoning = "";
      const finalTools: ToolCall[] = [];

      try {
        let streamingWorked = false;

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const messagesApi = client.agents.messages as any;

          let stream: AsyncIterable<unknown> | null = null;

          if (typeof messagesApi.createStream === "function") {
            stream = await messagesApi.createStream(agentId, {
              input: userInput,
              stream_tokens: false, // Step streaming - complete messages
            });
          } else if (typeof messagesApi.stream === "function") {
            stream = await messagesApi.stream(agentId, {
              input: userInput,
              stream_tokens: false,
            });
          }

          if (!stream) {
            throw new Error("No streaming method available in SDK");
          }

          const contentByMessageId = new Map<string, string>();
          const reasoningParts: string[] = [];
          const tools: ToolCall[] = [];

          for await (const chunk of stream) {
            const event = chunk as Record<string, unknown>;
            const messageType = event.message_type as string | undefined;
            const messageId = event.id as string | undefined;

            switch (messageType) {
              case "assistant_message": {
                const content = extractAssistantContent(event.content);
                if (content && messageId) {
                  const existing = contentByMessageId.get(messageId) || "";
                  if (content.length > existing.length) {
                    contentByMessageId.set(messageId, content);
                  }
                  finalAnswer = Array.from(contentByMessageId.values()).join("");
                  setCurrentAnswer(finalAnswer);
                } else if (content) {
                  finalAnswer = content;
                  setCurrentAnswer(finalAnswer);
                }
                break;
              }

              case "reasoning_message": {
                const reasoning = (event.reasoning as string) || "";
                if (reasoning) {
                  reasoningParts.push(reasoning);
                  finalReasoning = reasoningParts.join("\n");
                  setCurrentReasoning(finalReasoning);
                }
                break;
              }

              case "hidden_reasoning_message": {
                const hiddenReasoning = (event.hidden_reasoning as string) || "";
                if (hiddenReasoning) {
                  reasoningParts.push(hiddenReasoning);
                  finalReasoning = reasoningParts.join("\n");
                  setCurrentReasoning(finalReasoning);
                }
                break;
              }

              case "tool_call_message": {
                const toolCall = event.tool_call as
                  | {
                      arguments?: string;
                      name?: string;
                      tool_call_id?: string;
                    }
                  | undefined;

                if (toolCall?.name) {
                  tools.push({
                    name: toolCall.name,
                    arguments: parseToolArguments(toolCall.arguments),
                    toolCallId: toolCall.tool_call_id,
                  });
                  setToolCalls([...tools]);
                  finalTools.push(
                    ...tools.filter((t) => !finalTools.some((ft) => ft.toolCallId === t.toolCallId))
                  );
                }
                break;
              }

              case "tool_return_message": {
                break;
              }

              case "error_message": {
                const errorMsg = (event.message as string) || "Unknown error";
                setError(errorMsg);
                break;
              }

              case "stop_reason": {
                const stopReason = event.stop_reason as string;
                if (stopReason === "error") {
                  setError("Agent stopped due to an error");
                }
                break;
              }

              case "ping":
              case "usage_statistics": {
                break;
              }
            }
          }

          streamingWorked = true;
        } catch {
          // Fallback to non-streaming
        }

        if (!streamingWorked) {
          const response = await client.agents.messages.create(agentId, {
            input: userInput,
          });

          const responseMessages: Record<string, unknown>[] = Array.isArray(response)
            ? response
            : (((response as Record<string, unknown>).messages as Record<string, unknown>[]) ?? []);

          const assistantParts: string[] = [];
          const reasoningParts: string[] = [];
          const tools: ToolCall[] = [];

          for (const msg of responseMessages) {
            const msgType = msg.message_type as string | undefined;

            if (msgType === "assistant_message") {
              const content = extractAssistantContent(msg.content);
              if (content) {
                assistantParts.push(content);
              }
            } else if (msgType === "reasoning_message") {
              const reasoning = (msg.reasoning as string) || "";
              if (reasoning) {
                reasoningParts.push(reasoning);
              }
            } else if (msgType === "tool_call_message") {
              const toolCall = msg.tool_call as
                | {
                    arguments?: string;
                    name?: string;
                    tool_call_id?: string;
                  }
                | undefined;
              if (toolCall?.name) {
                tools.push({
                  name: toolCall.name,
                  arguments: parseToolArguments(toolCall.arguments),
                  toolCallId: toolCall.tool_call_id,
                });
              }
            }
          }

          finalAnswer = assistantParts.join("");
          finalReasoning = reasoningParts.join("\n");
          finalTools.push(...tools);
        }

        if (finalAnswer) {
          const assistantMessage: ChatMessage = {
            role: "assistant",
            content: finalAnswer,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
        if (finalReasoning) {
          setCurrentReasoning(finalReasoning);
        }
        if (finalTools.length > 0) {
          setToolCalls(finalTools);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Error talking to Letta.";
        setError(errorMessage);
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
        setCurrentAnswer("");
      }
    },
    [agentId, client]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setCurrentAnswer("");
    setCurrentReasoning("");
    setToolCalls([]);
    setError(null);
  }, []);

  const answer =
    currentAnswer || messages.filter((m) => m.role === "assistant").slice(-1)[0]?.content || null;
  const reasoning = currentReasoning || null;

  return {
    isLoading,
    messages,
    setMessages,
    answer,
    reasoning,
    toolCalls,
    error,
    send,
    reset,
  };
}
