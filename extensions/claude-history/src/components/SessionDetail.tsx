import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { SessionSummary } from "../lib/types.js";
import {
  exchangesToMarkdown,
  shortenPath,
  relativeTime,
} from "../lib/formatters.js";
import { parseSessionExchanges } from "../lib/session-parser.js";
import { FULL_SESSION_EXCHANGES } from "../lib/constants.js";
import {
  resumeInTerminal,
  openInFinder,
  openInVSCode,
  copySessionId,
  copyResumeCommand,
} from "../lib/actions.js";

type Props = {
  session: SessionSummary;
};

export default function SessionDetail({ session }: Props) {
  const { data: exchanges, isLoading } = useCachedPromise(
    (fp) => parseSessionExchanges(fp, FULL_SESSION_EXCHANGES),
    [session.filePath],
  );

  const header = [
    `# ${session.firstPrompt}`,
    "",
    `**Project:** ${shortenPath(session.projectPath)}`,
    session.gitBranch ? `**Branch:** \`${session.gitBranch}\`` : null,
    `**Session:** \`${session.sessionId}\``,
    `**Time:** ${relativeTime(session.timestamp)} (${session.timestamp.toLocaleString()})`,
    `**Messages:** ~${session.messageCount}`,
    "",
    "---",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  const body = exchanges ? exchangesToMarkdown(exchanges) : "";
  const markdown = header + body;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Resume in Terminal"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => resumeInTerminal(session)}
          />
          <Action
            title="Open in Finder"
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() => openInFinder(session.projectPath)}
          />
          <Action
            title="Open in VS Code"
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            onAction={() => openInVSCode(session.projectPath)}
          />
          <Action
            title="Copy Session Id"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={() => copySessionId(session.sessionId)}
          />
          <Action
            title="Copy Resume Command"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => copyResumeCommand(session)}
          />
        </ActionPanel>
      }
    />
  );
}
