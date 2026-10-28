import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, BuildLogLine, BuildStatus, getBuildLog, isRunning } from "./mflare";

type Build = Extract<Activity, { kind: "build" }>;
type Filter = "all" | "error" | "warning";

// Each read asks Cloudflare and uses up MFlare's request budget, so a running Build is read again only this often.
const LIVE_READ_MS = 10_000;

// A Build's Build Log, read from MFlare when opened and, while the Build runs, every few seconds after that.
export default function BuildLog({ worker, build, accountId }: { worker: string; build: Build; accountId?: string }) {
  const [lines, setLines] = useState<BuildLogLine[]>([]);
  const [status, setStatus] = useState<BuildStatus>(build.status);
  const [isComplete, setIsComplete] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [filter, setFilter] = useState<Filter>("all");
  const cursor = useRef<string | undefined>(undefined);

  // Reads the lines after the last ones read.
  const readOn = useCallback(async () => {
    setIsLoading(true);
    try {
      const page = await getBuildLog(worker, build.id, accountId, cursor.current);
      cursor.current = page.cursor ?? cursor.current;
      setLines((read) => [...read, ...page.lines]);
      setStatus(page.build_status);
      setIsComplete(page.is_complete);
      setHasMore(page.has_more);
      setError(undefined);
    } catch (readError) {
      setError(readError instanceof Error ? readError : new Error(String(readError)));
    } finally {
      setIsLoading(false);
    }
  }, [worker, build.id, accountId]);

  useEffect(() => {
    readOn();
  }, [readOn]);

  // A running Build keeps writing: read on now and then until it's complete. A read that failed isn't repeated on
  // its own, since it's most likely the rate limit.
  useEffect(() => {
    if (isComplete || hasMore || error || isLoading) return;
    const timer = setTimeout(readOn, LIVE_READ_MS);
    return () => clearTimeout(timer);
  }, [isComplete, hasMore, error, isLoading, readOn]);

  const shown = filter === "all" ? lines : lines.filter((line) => line.level === filter);
  const errors = lines.filter((line) => line.level === "error");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${worker} · Build ${build.commit_hash?.slice(0, 7) ?? build.id.slice(0, 8)}`}
      markdown={markdown(shown, filter, error, isLoading && lines.length === 0)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={statusText(status)} color={statusColor(status)} />
          </Detail.Metadata.TagList>
          {build.branch && <Detail.Metadata.Label title="Branch" text={build.branch} />}
          {build.commit_hash && <Detail.Metadata.Label title="Commit" text={build.commit_hash.slice(0, 7)} />}
          {build.author && <Detail.Metadata.Label title="Author" text={build.author} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Lines" text={String(lines.length)} />
          <Detail.Metadata.Label
            title="Errors"
            text={String(errors.length)}
            icon={errors.length > 0 ? { source: Icon.XMarkCircle, tintColor: Color.Red } : undefined}
          />
          <Detail.Metadata.Label
            title="Log"
            text={isComplete ? "Complete" : hasMore ? "More to read" : "Still running"}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {hasMore && (
            <Action
              title="Read More"
              icon={Icon.ArrowDown}
              shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
              onAction={readOn}
            />
          )}
          {error && <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={readOn} />}
          <ActionPanel.Section title="Show">
            <Action
              title="All Lines"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "1" }}
              onAction={() => setFilter("all")}
            />
            <Action
              title="Errors Only"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
              onAction={() => setFilter("error")}
            />
            <Action
              title="Warnings Only"
              icon={Icon.Warning}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
              onAction={() => setFilter("warning")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {errors.length > 0 && (
              <Action.CopyToClipboard
                title="Copy Errors"
                content={errors.map((line) => line.text).join("\n")}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Build Log"
              content={lines.map((line) => line.text).join("\n")}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function markdown(lines: BuildLogLine[], filter: Filter, error: Error | undefined, isFirstRead: boolean): string {
  const parts: string[] = [];
  if (error) parts.push(`**Couldn't read the Build Log.** ${error.message}`);
  if (isFirstRead) return parts.join("\n\n");
  if (lines.length === 0) {
    parts.push(filter === "all" ? "_No lines yet._" : `_No ${filter === "error" ? "error" : "warning"} lines._`);
  } else {
    // A tilde fence, since Build Logs often print backticks. Raycast colors neither text nor diff blocks, but an emoji
    // keeps its color in a code block: errors and warnings start with one, the other lines with spaces as wide.
    const marks = { error: "🔴 ", warning: "🟡 " };
    const body = lines.map((line) => `${line.level ? marks[line.level] : "   "}${time(line.date)}  ${line.text}`);
    parts.push(["~~~", ...body, "~~~"].join("\n"));
  }
  return parts.join("\n\n");
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour12: false });
}

function statusText(status: BuildStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusColor(status: BuildStatus): Color {
  if (status === "failed") return Color.Red;
  if (status === "succeeded") return Color.Green;
  if (isRunning(status)) return Color.Blue;
  return Color.SecondaryText;
}
