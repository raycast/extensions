import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as path from "path";
import { useEffect, useState } from "react";
import { getCachedSession, setCachedSession } from "./lib/cache";
import { expandPath, listJsonlFiles } from "./lib/discovery";
import { parseSession } from "./lib/parser";
import { relativeTime } from "./lib/relative-time";
import { formatResumeCommand, resumeSession } from "./lib/terminal";
import { Preferences, Session } from "./lib/types";

function parseLimit(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "50", 10);
  if (!Number.isFinite(n)) return 50;
  return Math.max(10, Math.min(500, n));
}

async function loadSessions(rootPath: string, limit: number): Promise<Session[]> {
  const t0 = performance.now();
  const files = await listJsonlFiles(rootPath);
  const t1 = performance.now();
  console.log(`[claude-sessions] discover: ${(t1 - t0).toFixed(0)}ms — ${files.length} JSONLs total`);

  if (files.length === 0) return [];

  // Sort by mtime DESC, then trim to limit before parsing — saves work on cold start.
  files.sort((a, b) => b.mtime - a.mtime);
  const head = files.slice(0, limit);

  // allSettled so a single hanging parse can't block the whole list.
  // Each file gets a 3s safety timeout (parseSession itself should take <50ms).
  const results = await Promise.allSettled(
    head.map(async (file) => {
      const uuid = path.basename(file.path, ".jsonl");
      const cached = await getCachedSession(uuid, file.mtime);
      if (cached) return cached;

      const session = await Promise.race<Session | null>([
        parseSession(file.path, file.mtime),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
      if (session) {
        void setCachedSession(uuid, session, file.mtime);
      }
      return session;
    }),
  );

  const sessions: Session[] = [];
  let failed = 0;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value !== null) {
      sessions.push(r.value);
    } else if (r.status === "rejected") {
      failed++;
    }
  }
  const t2 = performance.now();
  console.log(
    `[claude-sessions] parsed: ${(t2 - t1).toFixed(0)}ms — ${sessions.length} successful, ${head.length - sessions.length - failed} empty, ${failed} failed`,
  );
  return sessions;
}

export default function BrowseSessions() {
  const prefs = getPreferenceValues<Preferences>();
  const limit = parseLimit(prefs.sessionLimit);
  const rootPath = prefs.jsonlRootPath || "~/.claude/projects";
  const [showDetail, setShowDetail] = useState(false);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (root: string, lim: number) => loadSessions(root, lim),
    [rootPath, limit],
    { initialData: [] as Session[] },
  );

  useEffect(() => {
    if (error) {
      void showToast({ style: Toast.Style.Failure, title: "Failed to load sessions", message: error.message });
    }
  }, [error]);

  const sessions = data ?? [];

  if (!isLoading && sessions.length === 0) {
    return <EmptySessions rootPath={rootPath} onRefresh={revalidate} />;
  }

  return (
    <List isLoading={isLoading} isShowingDetail={showDetail} searchBarPlaceholder="Search title, CWD, or UUID">
      {sessions.map((session) => (
        <SessionItem
          key={session.uuid}
          session={session}
          terminalApp={prefs.terminalApp}
          showDetail={showDetail}
          toggleDetail={() => setShowDetail((v) => !v)}
          onRefresh={revalidate}
        />
      ))}
    </List>
  );
}

function SessionItem(props: {
  session: Session;
  terminalApp: string;
  showDetail: boolean;
  toggleDetail: () => void;
  onRefresh: () => void;
}) {
  const { session, terminalApp, showDetail, toggleDetail, onRefresh } = props;
  const cwdTail = path.basename(session.cwd) || session.cwd;
  const primaryLabel = terminalApp === "terminal" ? "Resume in Terminal" : "Resume in iTerm2";
  const secondaryLabel = terminalApp === "terminal" ? "Resume in iTerm2" : "Resume in Terminal";
  const otherApp = terminalApp === "terminal" ? "iterm2" : "terminal";

  const handleResume = async (app: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Opening ${app === "terminal" ? "Terminal" : "iTerm2"}…`,
    });
    try {
      await resumeSession(app, session.cwd, session.uuid);
      toast.style = Toast.Style.Success;
      toast.title = "Session resumed";
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to open terminal";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  };

  return (
    <List.Item
      icon={Icon.SpeechBubble}
      title={session.title || "(empty session)"}
      subtitle={showDetail ? undefined : cwdTail}
      keywords={[session.uuid, session.cwd]}
      accessories={
        showDetail
          ? undefined
          : [{ tag: relativeTime(session.timestamp), tooltip: session.timestamp }, { text: cwdTail }]
      }
      detail={<SessionDetailView session={session} />}
      actions={
        <ActionPanel>
          <Action title={primaryLabel} icon={Icon.Terminal} onAction={() => handleResume(terminalApp)} />
          <Action title={secondaryLabel} icon={Icon.Terminal} onAction={() => handleResume(otherApp)} />
          <Action
            title={showDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "y" }}
            onAction={toggleDetail}
          />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Resume Command"
              content={formatResumeCommand(session.cwd, session.uuid)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard title="Copy Session Identifier" content={session.uuid} />
            <Action.CopyToClipboard title="Copy Working Directory" content={session.cwd} />
            <Action.CopyToClipboard title="Copy Log File Path" content={session.jsonlPath} />
          </ActionPanel.Section>
          <ActionPanel.Section title="File">
            <Action.ShowInFinder path={session.jsonlPath} />
            <Action.Open title="Open Log File in Editor" target={session.jsonlPath} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SessionDetailView({ session }: { session: Session }) {
  // Render the user message inside a code fence so embedded Markdown/HTML stays inert
  // (prevents phishing-style auto-link injection from untrusted JSONL content).
  // Any embedded ``` is neutralised by switching to a longer fence.
  const body = session.firstUserMessage;
  const fence = body.includes("```") ? "~~~~" : "```";
  const markdown = `${fence}text\n${body}\n${fence}`;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="UUID" text={session.uuid} />
          <List.Item.Detail.Metadata.Label title="CWD" text={session.cwd} />
          <List.Item.Detail.Metadata.Label title="Timestamp" text={session.timestamp} />
          <List.Item.Detail.Metadata.Label title="Relative" text={relativeTime(session.timestamp)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="JSONL"
            text={session.jsonlPath}
            target={`file://${session.jsonlPath}`}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function EmptySessions({ rootPath, onRefresh }: { rootPath: string; onRefresh: () => void }) {
  const expanded = expandPath(rootPath);
  return (
    <List>
      <List.EmptyView
        icon={Icon.Stars}
        title="No Claude Sessions Found"
        description={`Looked under: ${expanded}\n\nStart a session in Claude Code, or adjust the JSONL Root Path in preferences.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Claude Code Docs"
              url="https://docs.claude.com/en/docs/claude-code/overview"
            />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
          </ActionPanel>
        }
      />
    </List>
  );
}
