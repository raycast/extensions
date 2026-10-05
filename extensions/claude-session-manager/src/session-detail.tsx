import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ClaudeSession } from "./lib/sessions";
import { relativeTime } from "./lib/relative-time";
import { getLastExchange, LastExchange } from "./lib/transcript";
import { resumeSessionInTerminal } from "./lib/terminal";
import { SessionUtilityActions } from "./session-actions";

const PREVIEW_LIMIT = 2000;

function truncate(text: string, limit: number): string {
  return text.length > limit ? text.slice(0, limit) + "…" : text;
}

function buildMarkdown(exchange: LastExchange | null | undefined, isLoading: boolean): string {
  if (isLoading) return "_Loading…_";
  if (!exchange) return "_No messages found in this session._";

  const parts: string[] = [];
  if (exchange.lastUserText) {
    parts.push("**You**", "", truncate(exchange.lastUserText, PREVIEW_LIMIT));
  }
  if (exchange.lastAssistantText) {
    parts.push("**Claude**", "", truncate(exchange.lastAssistantText, PREVIEW_LIMIT));
  }

  return parts.length > 0 ? parts.join("\n\n") : "_No messages found in this session._";
}

export default function SessionDetail({
  session,
  isPinned,
  onTogglePin,
}: {
  session: ClaudeSession;
  isPinned: boolean;
  onTogglePin: () => void;
}) {
  const { data: exchange, isLoading } = usePromise(
    () =>
      session.mockExchange
        ? Promise.resolve(session.mockExchange)
        : getLastExchange(session.id, session.filePath, session.mtimeMs),
    [],
  );

  async function resume() {
    if (session.mockExchange) {
      await showToast({ style: Toast.Style.Failure, title: "This is a demo session — nothing to resume" });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Opening terminal…" });
    try {
      const result = await resumeSessionInTerminal(session.cwd, session.id);
      await showToast(
        result.mode === "auto"
          ? { style: Toast.Style.Success, title: "Resumed session" }
          : {
              style: Toast.Style.Success,
              title: `Opened ${result.appName}`,
              message: "Command copied — paste to resume",
            },
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to resume session",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(exchange, isLoading)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Project" text={session.projectName} />
          <Detail.Metadata.Label title="Path" text={session.cwd} />
          <Detail.Metadata.Label title="Branch" text={session.gitBranch ?? "—"} />
          <Detail.Metadata.Label title="Last Active" text={relativeTime(session.lastActiveAt)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Resume Session" icon={Icon.Terminal} onAction={resume} />
          <SessionUtilityActions session={session} isPinned={isPinned} onTogglePin={onTogglePin} />
        </ActionPanel>
      }
    />
  );
}
