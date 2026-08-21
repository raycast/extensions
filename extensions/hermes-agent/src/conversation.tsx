import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getConfig } from "./api";
import {
  createSession,
  getSessionMessages,
  renameSession,
  SessionMessage,
  streamSessionChat,
  ToolActivity,
} from "./hermes-client";

interface DisplayMessage {
  key: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number | null;
  toolNames: string[];
}

const TOOL_STATE_LABEL: Record<ToolActivity["state"], string> = {
  started: "running",
  completed: "done",
  failed: "failed",
};

function toDisplayMessages(messages: SessionMessage[]): DisplayMessage[] {
  const display: DisplayMessage[] = [];
  let pendingTools: string[] = [];

  for (const msg of messages) {
    if (msg.role === "assistant" && msg.tool_calls?.length) {
      for (const call of msg.tool_calls) {
        const name = call.function?.name;
        if (name && !pendingTools.includes(name)) {
          pendingTools.push(name);
        }
      }
    }
    const content = (msg.content || "").trim();
    if (!content || (msg.role !== "user" && msg.role !== "assistant")) {
      continue;
    }
    display.push({
      key: `db-${msg.id}`,
      role: msg.role,
      content,
      timestamp: msg.timestamp,
      toolNames: msg.role === "assistant" ? pendingTools : [],
    });
    if (msg.role === "assistant") {
      pendingTools = [];
    }
  }
  return display;
}

function formatTime(timestamp: number | null): string {
  if (!timestamp) {
    return "";
  }
  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Live conversation on a server-side Hermes session. Works for sessions
 * started in Raycast and for sessions started on any other surface (CLI,
 * desktop, messaging platforms) — the transcript and continuation both go
 * through the API server.
 */
export function ConversationView(props: {
  sessionId?: string;
  sessionTitle?: string;
  initialUserMessage?: string;
}) {
  const config = useMemo(() => getConfig(), []);
  const [sessionId, setSessionId] = useState<string | undefined>(
    props.sessionId,
  );
  const [transcript, setTranscript] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(props.sessionId));
  const [isRunning, setIsRunning] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [toolLog, setToolLog] = useState<ToolActivity[]>([]);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(
    null,
  );
  const lastUiUpdate = useRef(0);
  const streamBuffer = useRef("");
  const kickoffSent = useRef(false);

  const refreshTranscript = useCallback(
    async (sid: string) => {
      try {
        const messages = await getSessionMessages(config, sid, 500);
        setTranscript(toDisplayMessages(messages));
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load transcript",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [config],
  );

  useEffect(() => {
    if (props.sessionId) {
      refreshTranscript(props.sessionId).finally(() => setIsLoading(false));
    }
  }, [props.sessionId, refreshTranscript]);

  const runTurn = useCallback(
    async (messageText: string) => {
      setIsRunning(true);
      setPendingUserMessage(messageText);
      setStreamingContent("");
      setToolLog([]);
      streamBuffer.current = "";
      lastUiUpdate.current = 0;

      try {
        let sid = sessionId;
        const isNewSession = !sid;
        if (!sid) {
          sid = await createSession(config);
          setSessionId(sid);
        }

        const result = await streamSessionChat(config, sid, messageText, {
          onDelta: (chunk) => {
            streamBuffer.current += chunk;
            const now = Date.now();
            if (now - lastUiUpdate.current > 100) {
              lastUiUpdate.current = now;
              setStreamingContent(streamBuffer.current);
            }
          },
          onTool: (activity) => {
            setToolLog((prev) => {
              const next = prev.filter(
                (t) =>
                  !(
                    t.toolName === activity.toolName && t.state === "started"
                  ) || activity.state === "started",
              );
              return [...next, activity].slice(-12);
            });
          },
        });

        if (isNewSession) {
          renameSession(config, sid, messageText.slice(0, 50)).catch(
            () => undefined,
          );
        }
        await refreshTranscript(result.sessionId || sid);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Message failed",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsRunning(false);
        setPendingUserMessage(null);
        setStreamingContent("");
        setToolLog([]);
      }
    },
    [config, refreshTranscript, sessionId],
  );

  useEffect(() => {
    if (props.initialUserMessage && !kickoffSent.current) {
      kickoffSent.current = true;
      runTurn(props.initialUserMessage);
    }
  }, [props.initialUserMessage, runTurn]);

  const handleSend = useCallback(() => {
    const messageText = input.trim();
    if (!messageText || isRunning) {
      return;
    }
    setInput("");
    runTurn(messageText);
  }, [input, isRunning, runTurn]);

  const activeTool = toolLog.length > 0 ? toolLog[toolLog.length - 1] : null;
  const streamingMarkdown = useMemo(() => {
    const parts: string[] = [];
    if (streamingContent) {
      parts.push(streamingContent);
    }
    if (toolLog.length > 0) {
      const lines = toolLog
        .map(
          (t) =>
            `- \`${t.toolName}\` ${TOOL_STATE_LABEL[t.state]}${t.preview ? ` — ${t.preview.slice(0, 80)}` : ""}`,
        )
        .join("\n");
      parts.push(`---\n\n**Tool activity**\n\n${lines}`);
    }
    if (parts.length === 0) {
      parts.push("*Waiting for Hermes…*");
    }
    return parts.join("\n\n");
  }, [streamingContent, toolLog]);

  const lastAssistant = [...transcript]
    .reverse()
    .find((m) => m.role === "assistant");

  const sendAction = (
    <Action title="Send Message" icon={Icon.Message} onAction={handleSend} />
  );

  return (
    <List
      isLoading={isLoading || isRunning}
      filtering={false}
      searchBarPlaceholder={
        isRunning
          ? activeTool
            ? `Hermes is using ${activeTool.toolName}…`
            : "Hermes is working…"
          : "Type a message and press Enter…"
      }
      searchText={input}
      onSearchTextChange={setInput}
      isShowingDetail
      navigationTitle={props.sessionTitle || "Chat with Hermes"}
      actions={<ActionPanel>{sendAction}</ActionPanel>}
    >
      {isRunning && (
        <List.Item
          key="streaming"
          icon={Icon.Stars}
          title="Hermes"
          subtitle={
            activeTool
              ? `${activeTool.toolName} ${TOOL_STATE_LABEL[activeTool.state]}`
              : "responding…"
          }
          detail={<List.Item.Detail markdown={streamingMarkdown} />}
          actions={<ActionPanel>{sendAction}</ActionPanel>}
        />
      )}
      {pendingUserMessage && (
        <List.Item
          key="pending-user"
          icon={Icon.Person}
          title="You"
          detail={<List.Item.Detail markdown={pendingUserMessage} />}
          actions={<ActionPanel>{sendAction}</ActionPanel>}
        />
      )}
      {transcript.length === 0 && !isRunning && !pendingUserMessage ? (
        <List.Item
          title="Start a conversation"
          subtitle="Type above and press Enter"
          icon={Icon.Message}
          detail={
            <List.Item.Detail markdown="Type a message above and press **Enter**. Hermes runs on the server with its full toolset — terminal, files, web, and anything else enabled there." />
          }
          actions={<ActionPanel>{sendAction}</ActionPanel>}
        />
      ) : (
        [...transcript].reverse().map((msg) => (
          <List.Item
            key={msg.key}
            icon={msg.role === "user" ? Icon.Person : Icon.Stars}
            title={msg.role === "user" ? "You" : "Hermes"}
            subtitle={
              msg.toolNames.length > 0
                ? `used ${msg.toolNames.join(", ")}`
                : formatTime(msg.timestamp)
            }
            detail={<List.Item.Detail markdown={msg.content} />}
            actions={
              <ActionPanel>
                {sendAction}
                <Action.CopyToClipboard
                  title="Copy This Message"
                  content={msg.content}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                {lastAssistant && (
                  <Action.CopyToClipboard
                    title="Copy Last Response"
                    content={lastAssistant.content}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                )}
                {sessionId && (
                  <Action.CopyToClipboard
                    title="Copy Session ID"
                    content={sessionId}
                  />
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
