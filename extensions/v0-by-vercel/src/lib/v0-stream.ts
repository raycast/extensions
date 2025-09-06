export interface StreamOptions {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
  onChatUpdate?: (chat: {
    id?: string;
    messages?: Array<{ role?: string; content?: string; finishReason?: string }>;
  }) => void;
  debug?: boolean;
}

export function streamV0({ url, headers, body, onDelta, onDone, onError, onChatUpdate, debug }: StreamOptions) {
  const controller = new AbortController();

  type StreamMessage = { role?: "user" | "assistant"; content?: string; finishReason?: string };
  type StreamChat = { object: "chat"; messages: StreamMessage[] };
  type StreamDelta = { object: "message.experimental_content.chunk"; delta: unknown };

  const isStreamChat = (v: unknown): v is StreamChat => {
    const obj = v as { object?: unknown; messages?: unknown };
    return obj?.object === "chat" && Array.isArray(obj?.messages);
  };

  const isStreamDelta = (v: unknown): v is StreamDelta => {
    const obj = v as { object?: unknown; delta?: unknown };
    return obj?.object === "message.experimental_content.chunk" && "delta" in (obj || {});
  };

  (async () => {
    try {
      const dlog = (...args: unknown[]) => {
        if (debug) console.log("[v0-stream]", ...args);
      };
      dlog("Starting stream", { url });
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "User-Agent": "Raycast-v0-Extension",
          ...headers,
        },
        body: JSON.stringify({ ...(body as object), responseMode: "experimental_stream" }),
        signal: controller.signal,
      });

      if (!response.ok) {
        dlog("Non-OK response", response.status);
        throw new Error(`Stream failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Readable stream not available on response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let didComplete = false;
      let accumulatedText = "";

      const emitNewSuffix = (fullText: string) => {
        if (typeof fullText !== "string") return;
        if (fullText.length <= accumulatedText.length) return;
        const suffix = fullText.slice(accumulatedText.length);
        accumulatedText = fullText;
        if (suffix) onDelta(suffix);
      };

      const collectArrayDeltaStrings = (delta: unknown): string => {
        try {
          const gather = (node: unknown): string[] => {
            if (Array.isArray(node)) {
              const last = node[node.length - 1];
              const tokens: string[] = [];
              if (typeof last === "string") tokens.push(last);
              for (const child of node) tokens.push(...gather(child));
              return tokens;
            }
            return [];
          };
          const parts = gather(delta);
          // Join, but strip obvious mid-token artifacts and footnote markers when incomplete
          const raw = parts.filter((s) => s && !/^(p|ul|li|code)$/i.test(s)).join("");
          return raw.replace(/\s*\[\^?$/g, "");
        } catch {
          return "";
        }
      };

      const extractTextFromDelta = (delta: unknown): string => {
        try {
          const json = JSON.stringify(delta);
          const re = /\[\s*"text"\s*,\s*\{[^}]*\}\s*,\s*"([\s\S]*?)"\s*\]/g;
          const parts: string[] = [];
          let m: RegExpExecArray | null = re.exec(json);
          while (m !== null) {
            parts.push(m[1]);
            m = re.exec(json);
          }
          const fromTriples = parts.join("");
          if (fromTriples) return fromTriples;
          return collectArrayDeltaStrings(delta);
        } catch {
          return "";
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sepIndex: number = buffer.indexOf("\n\n");
        while (sepIndex !== -1) {
          const chunk = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);

          const lines = chunk.split("\n");
          let eventName = "";
          const dataParts: string[] = [];
          for (const line of lines) {
            const trimmed = line.trimStart();
            if (trimmed.startsWith("event:")) {
              eventName = trimmed.slice("event:".length).trim();
            } else if (trimmed.startsWith("data:")) {
              dataParts.push(trimmed.slice("data:".length).trim());
            }
          }
          const raw = dataParts.join("\n");
          if (!raw && !eventName) {
            sepIndex = buffer.indexOf("\n\n");
            continue;
          }
          dlog("SSE chunk", { eventName, rawPreview: raw.slice(0, 120) });

          try {
            const parsedUnknown: unknown = JSON.parse(raw);

            // v0 emits full chat snapshots and experimental content deltas
            if (isStreamChat(parsedUnknown)) {
              dlog("chat snapshot", {
                textLen: (parsedUnknown as { text?: string }).text?.length,
                messages: (parsedUnknown as StreamChat).messages?.length,
              });
              if (onChatUpdate) {
                try {
                  const chatObj = parsedUnknown as StreamChat;
                  onChatUpdate({ id: (chatObj as { id?: string }).id, messages: chatObj.messages });
                } catch {
                  // ignore callback errors
                }
              }
              const assistantMessages = parsedUnknown.messages.filter((m) => m.role === "assistant");
              const last = assistantMessages[assistantMessages.length - 1];
              const snapshotText = (parsedUnknown as unknown as { text?: string }).text;
              if (typeof snapshotText === "string" && snapshotText.length > 0) {
                emitNewSuffix(snapshotText);
              } else if (last?.content) {
                emitNewSuffix(String(last.content));
              }
              if (last?.finishReason === "stop") {
                dlog("finishReason stop (snapshot)");
                didComplete = true;
                onDone();
                try {
                  controller.abort();
                } catch {
                  void 0;
                }
                break;
              }
            } else if (isStreamDelta(parsedUnknown)) {
              // Extract any new text tokens from the experimental_content delta structure
              try {
                const deltaJson = JSON.stringify(parsedUnknown.delta);
                const collected = extractTextFromDelta(parsedUnknown.delta);
                dlog("delta", { collectedPreview: collected.slice(0, 80) });
                if (collected) emitNewSuffix(accumulatedText + collected);
                if (/"finishReason"\s*:\s*\[\s*"stop"\s*\]/.test(deltaJson)) {
                  dlog("finishReason stop (delta)");
                  didComplete = true;
                  onDone();
                  try {
                    controller.abort();
                  } catch {
                    void 0;
                  }
                  break;
                }
              } catch {
                // ignore unparseable delta
              }
            } else if (
              (parsedUnknown as { object?: string })?.object === "chat.title" ||
              (parsedUnknown as { object?: string })?.object === "chat.name"
            ) {
              dlog("ignored", (parsedUnknown as { object?: string }).object);
              // ignore title/name
            } else {
              // Fallbacks if event name is present or alternative formats
              const maybeObj = parsedUnknown as {
                type?: string;
                delta?: unknown;
                contentDelta?: unknown;
                text?: unknown;
              };
              if (eventName === "message.completed" || maybeObj?.type === "message.completed") {
                dlog("message.completed event");
                didComplete = true;
                onDone();
                try {
                  controller.abort();
                } catch {
                  void 0;
                }
                break;
              }
              const deltaText =
                typeof parsedUnknown === "string"
                  ? parsedUnknown
                  : typeof maybeObj?.delta === "string"
                    ? (maybeObj.delta as string)
                    : typeof maybeObj?.contentDelta === "string"
                      ? (maybeObj.contentDelta as string)
                      : typeof maybeObj?.text === "string"
                        ? (maybeObj.text as string)
                        : "";
              dlog("fallback delta", { deltaPreview: (deltaText as string).slice?.(0, 80) });
              if (deltaText) emitNewSuffix(accumulatedText + deltaText);
            }
          } catch {
            // If we fail to parse JSON, surface the raw line
            dlog("json-parse-failed", raw.slice(0, 120));
            onDelta(raw);
          }

          sepIndex = buffer.indexOf("\n\n");
        }
      }

      if (!didComplete) {
        dlog("onDone (reader ended)");
        onDone();
      }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      if (debug) console.error("[v0-stream] error", error);
      onError(error as Error);
    }
  })();

  return () => controller.abort();
}
