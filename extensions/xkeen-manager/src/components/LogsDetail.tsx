/* eslint-disable @typescript-eslint/no-explicit-any */

import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { runRemote } from "../lib/ssh";
import { cleanOutput, mdCode } from "../lib/utils";

type LogSource = "logread" | "ndmc" | "file" | "none";

type LogsData = {
  source: LogSource;
  text: string;
};

// logread/ndmc emit one line per record, so reversing lines gives newest-on-top.
// A plain log file can contain multi-line records; reversing would scramble
// them, so those are left in their natural (oldest-first) order.
const SINGLE_LINE_SOURCES: LogSource[] = ["logread", "ndmc"];

async function loadLogs(): Promise<LogsData> {
  const { stdout, stderr } = await runRemote(
    "if command -v logread >/dev/null 2>&1; then echo 'SOURCE=logread'; logread | tail -n 200; " +
      "elif command -v ndmc >/dev/null 2>&1; then echo 'SOURCE=ndmc'; ndmc -c 'show log' | tail -n 200; " +
      "elif [ -f /opt/var/log/xkeen.log ]; then echo 'SOURCE=file'; tail -n 200 /opt/var/log/xkeen.log; " +
      "else echo 'SOURCE=none'; echo 'No log source found'; fi",
  );
  const lines = cleanOutput(stdout, stderr).text.split("\n");
  const sourceMatch = lines[0]?.match(/^SOURCE=(logread|ndmc|file|none)$/);
  const source: LogSource = (sourceMatch?.[1] as LogSource | undefined) ?? "none";
  const rest = sourceMatch ? lines.slice(1) : lines;
  const orderedLines = SINGLE_LINE_SOURCES.includes(source) ? [...rest].reverse() : rest;
  return { source, text: orderedLines.join("\n") };
}

function orderingNote(source: LogSource): string {
  if (source === "file") return "\n\n*newest entries at the bottom*";
  if (source === "logread" || source === "ndmc") return "\n\n*newest entries at the top*";
  return "";
}

export function LogsDetail() {
  const { data, isLoading, error, revalidate } = usePromise(loadLogs);

  const text = data?.text ?? "";
  const md = error ? mdCode("Logs", error.message) : mdCode("Logs", text) + orderingNote(data?.source ?? "none");

  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.RotateClockwise} onAction={revalidate} />
          <Action.CopyToClipboard title="Copy Logs" content={text} />
        </ActionPanel>
      }
    />
  );
}

export function RestartDetail(props: { onDone?: () => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState("");
  async function run() {
    setIsLoading(true);
    try {
      const { stdout, stderr } = await runRemote("xkeen -restart");
      setText(cleanOutput(stdout, stderr).text);
      props.onDone?.();
    } catch (e: any) {
      setText(e?.message ?? String(e));
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => {
    void run();
  }, []);
  return (
    <Detail
      isLoading={isLoading}
      markdown={mdCode("Restart", text)}
      actions={
        <ActionPanel>
          <Action title="Restart Again" icon={Icon.RotateClockwise} onAction={run} />
        </ActionPanel>
      }
    />
  );
}
