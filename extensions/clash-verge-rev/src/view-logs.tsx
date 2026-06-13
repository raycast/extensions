import { useState, useEffect, useRef, useCallback } from "react";
import {
  List,
  Icon,
  Color,
  Action,
  ActionPanel,
  showToast,
  Toast,
} from "@raycast/api";
import { getLogStreamConfig } from "./utils/api";
import fetch from "node-fetch";
import { Readable } from "stream";

interface LogEntry {
  id: number;
  type: string;
  payload: string;
  time: string;
}

const MAX_LOGS = 100;

function logLevelIcon(type: string): { source: Icon; tintColor: Color } {
  switch (type.toLowerCase()) {
    case "error":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "warning":
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    case "debug":
      return { source: Icon.Bug, tintColor: Color.Purple };
    case "info":
    default:
      return { source: Icon.Info, tintColor: Color.SecondaryText };
  }
}

function logLevelTag(type: string): { value: string; color: Color } {
  switch (type.toLowerCase()) {
    case "error":
      return { value: "ERROR", color: Color.Red };
    case "warning":
      return { value: "WARN", color: Color.Orange };
    case "debug":
      return { value: "DEBUG", color: Color.Purple };
    case "info":
    default:
      return { value: "INFO", color: Color.SecondaryText };
  }
}

function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString("zh-CN", { hour12: false });
}

/** Parse "match X using Y" into separate fields */
function parseRuleAndNode(ruleStr: string): {
  matchRule: string;
  usingNode?: string;
} {
  // e.g. "match RuleSet(Microsoft-FB) using Microsoft[us United States | 01]"
  const m = ruleStr.match(/^(.+?)\s+using\s+(.+)$/);
  if (m) {
    return { matchRule: m[1].trim(), usingNode: m[2].trim() };
  }
  return { matchRule: ruleStr };
}

/** Parse log payload to extract structured info */
function parseLogPayload(payload: string) {
  // Match patterns like: [TCP] 198.18.0.1:54212(app.exe) --> target:443 match Rule using Proxy[🇭🇰 HK]
  const connMatch = payload.match(
    /^\[(\w+)\]\s+([\d.]+:\d+)(?:\(([^)]+)\))?\s+(?:-->|→)\s+(\S+)\s+(.+)$/,
  );
  if (connMatch) {
    const { matchRule, usingNode } = parseRuleAndNode(connMatch[5]);
    return {
      protocol: connMatch[1],
      source: connMatch[2],
      process: connMatch[3] || "unknown",
      destination: connMatch[4],
      matchRule,
      usingNode,
    };
  }

  // Match dial errors: [TCP] dial DIRECT (match ...) ...
  const dialMatch = payload.match(
    /^\[(\w+)\]\s+dial\s+(\w+)\s+\(([^)]+)\)\s+(.+)$/,
  );
  if (dialMatch) {
    const { matchRule, usingNode } = parseRuleAndNode(dialMatch[3]);
    return {
      protocol: dialMatch[1],
      action: `dial ${dialMatch[2]}`,
      matchRule,
      usingNode,
      detail: dialMatch[4],
    };
  }

  return null;
}

export default function ViewLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [filter, setFilter] = useState("");
  const [showDetail, setShowDetail] = useState(true);
  const idCounter = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const connectToLogs = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { url, headers, agent } = getLogStreamConfig("info");
      console.log("[Logs] Connecting to:", url);

      const fetchOpts: Record<string, unknown> = {
        signal: controller.signal,
        headers,
      };
      if (agent) {
        fetchOpts.agent = agent;
      }

      const response = await fetch(url, fetchOpts);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setIsConnected(true);

      const decoder = new TextDecoder();
      let buffer = "";

      // node-fetch returns a Node.js PassThrough stream (not a Web ReadableStream).
      // We need to handle both Node.js stream and Web ReadableStream APIs.
      const body = response.body;
      if (!body) {
        throw new Error("No response body");
      }

      // Helper to process a chunk of text into log entries
      const processChunk = (chunk: string) => {
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        const newEntries: LogEntry[] = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const data = JSON.parse(trimmed);
            if (data.type && data.payload) {
              idCounter.current += 1;
              newEntries.push({
                id: idCounter.current,
                type: data.type,
                payload: data.payload,
                time: formatTimestamp(),
              });
            }
          } catch {
            // skip malformed lines
          }
        }

        if (newEntries.length > 0) {
          setLogs((prev) => {
            const updated = [...newEntries.reverse(), ...prev];
            return updated.slice(0, MAX_LOGS);
          });
        }
      };

      // Check if body is a Node.js Readable stream (node-fetch case)
      if (body instanceof Readable || typeof (body as unknown as Record<string, unknown>).on === "function") {
        const nodeStream = body as Readable;
        nodeStream.setEncoding("utf-8");
        nodeStream.on("data", (chunk: string) => {
          processChunk(chunk);
        });
        nodeStream.on("error", (err: Error) => {
          console.error("[Logs] Stream error:", err);
          setIsConnected(false);
        });
        nodeStream.on("end", () => {
          console.log("[Logs] Stream ended");
          setIsConnected(false);
        });
      } else {
        // Web ReadableStream (browser-style fetch)
        const reader = (body as unknown as ReadableStream<Uint8Array>).getReader();
        if (!reader) {
          throw new Error("Cannot read response body");
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          processChunk(chunk);
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("[Logs] Connection error:", error);
      setIsConnected(false);
      showToast({
        style: Toast.Style.Failure,
        title: "Log connection failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  useEffect(() => {
    connectToLogs();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [connectToLogs]);

  const filteredLogs = filter
    ? logs.filter(
        (log) =>
          log.payload.toLowerCase().includes(filter.toLowerCase()) ||
          log.type.toLowerCase().includes(filter.toLowerCase()),
      )
    : logs;

  return (
    <List
      isLoading={!isConnected && logs.length === 0}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Filter logs..."
      onSearchTextChange={setFilter}
      navigationTitle="Clash Verge Logs"
    >
      {filteredLogs.length === 0 ? (
        <List.EmptyView
          title={isConnected ? "Waiting for logs..." : "Connecting..."}
          description={
            isConnected
              ? "New log entries will appear here in real-time"
              : "Trying to connect to Mihomo log stream"
          }
          icon={isConnected ? Icon.Clock : Icon.Wifi}
        />
      ) : (
        <List.Section
          title="Recent Logs"
          subtitle={`${filteredLogs.length} entries${isConnected ? " • Live" : " • Disconnected"}`}
        >
          {filteredLogs.map((log) => {
            const parsed = showDetail ? parseLogPayload(log.payload) : null;
            const tag = logLevelTag(log.type);

            return (
              <List.Item
                key={log.id}
                title={log.payload}
                icon={logLevelIcon(log.type)}
                accessories={
                  showDetail
                    ? []
                    : [{ tag }, { text: log.time, icon: Icon.Clock }]
                }
                detail={
                  showDetail ? (
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.TagList title="Level">
                            <List.Item.Detail.Metadata.TagList.Item
                              text={tag.value}
                              color={tag.color}
                            />
                          </List.Item.Detail.Metadata.TagList>
                          <List.Item.Detail.Metadata.Label
                            title="Time"
                            text={log.time}
                            icon={Icon.Clock}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          {parsed?.protocol && (
                            <List.Item.Detail.Metadata.Label
                              title="Protocol"
                              text={parsed.protocol}
                            />
                          )}
                          {parsed?.process && (
                            <List.Item.Detail.Metadata.Label
                              title="Process"
                              text={parsed.process}
                              icon={Icon.Terminal}
                            />
                          )}
                          {parsed?.source && (
                            <List.Item.Detail.Metadata.Label
                              title="Source"
                              text={parsed.source}
                            />
                          )}
                          {parsed?.destination && (
                            <List.Item.Detail.Metadata.Label
                              title="Destination"
                              text={parsed.destination}
                              icon={Icon.Globe}
                            />
                          )}
                          {parsed?.matchRule && (
                            <List.Item.Detail.Metadata.Label
                              title="Match Rule"
                              text={parsed.matchRule}
                              icon={Icon.Filter}
                            />
                          )}
                          {parsed?.usingNode && (
                            <List.Item.Detail.Metadata.Label
                              title="Using Node"
                              text={parsed.usingNode}
                              icon={Icon.Globe}
                            />
                          )}
                          {parsed?.action && (
                            <List.Item.Detail.Metadata.Label
                              title="Action"
                              text={parsed.action}
                            />
                          )}
                          {parsed?.detail && (
                            <List.Item.Detail.Metadata.Label
                              title="Detail"
                              text={parsed.detail}
                            />
                          )}
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Full Log"
                            text={log.payload}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  ) : undefined
                }
                actions={
                  <ActionPanel>
                    <Action
                      title={showDetail ? "List View" : "Detail View"}
                      icon={showDetail ? Icon.List : Icon.Sidebar}
                      onAction={() => setShowDetail(!showDetail)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Log Entry"
                      content={`[${log.time}] [${log.type.toUpperCase()}] ${log.payload}`}
                    />
                    <Action.CopyToClipboard
                      title="Copy All Visible Logs"
                      shortcut={{ macOS: { modifiers: ["cmd", "shift"], key: "c" }, Windows: { modifiers: ["ctrl", "shift"], key: "c" } }}
                      content={filteredLogs
                        .map(
                          (l) =>
                            `[${l.time}] [${l.type.toUpperCase()}] ${l.payload}`,
                        )
                        .join("\n")}
                    />
                    <Action
                      title="Clear Logs"
                      icon={Icon.Trash}
                      shortcut={{ macOS: { modifiers: ["cmd"], key: "x" }, Windows: { modifiers: ["ctrl"], key: "x" } }}
                      onAction={() => setLogs([])}
                    />
                    <Action
                      title="Reconnect"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ macOS: { modifiers: ["cmd"], key: "r" }, Windows: { modifiers: ["ctrl"], key: "r" } }}
                      onAction={() => {
                        setLogs([]);
                        connectToLogs();
                      }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
