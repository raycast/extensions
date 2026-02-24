import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { SessionSummary } from "../lib/types.js";
import { truncate, shortenPath } from "../lib/formatters.js";
import {
  resumeInTerminal,
  openInFinder,
  openInVSCode,
  copySessionId,
  copyResumeCommand,
} from "../lib/actions.js";
import SessionDetail from "./SessionDetail.js";

type Props = {
  session: SessionSummary;
  isFavourite: boolean;
  onToggleFavourite: () => void;
  detailMarkdown?: string;
};

export default function SessionListItem({
  session,
  isFavourite,
  onToggleFavourite,
  detailMarkdown,
}: Props) {
  // Use passed-in markdown if available, otherwise show a static preview
  const markdown =
    detailMarkdown ??
    [
      `### ${truncate(session.firstPrompt, 200)}`,
      "",
      `**Project:** ${shortenPath(session.projectPath)}`,
      session.gitBranch ? `**Branch:** \`${session.gitBranch}\`` : null,
      `**Messages:** ~${session.messageCount}`,
      "",
      "*Press Enter to view full conversation*",
    ]
      .filter(Boolean)
      .join("\n");

  const accessories: List.Item.Accessory[] = [];
  if (isFavourite) {
    accessories.push({ icon: Icon.Star, tooltip: "Favourite" });
  }
  accessories.push({ text: `${session.messageCount} msgs` });
  accessories.push({
    date: session.timestamp,
    tooltip: session.timestamp.toLocaleString(),
  });

  return (
    <List.Item
      id={session.filePath}
      title={truncate(session.firstPrompt, 80)}
      subtitle={session.gitBranch ? `${session.gitBranch}` : undefined}
      accessories={accessories}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Full Session"
              icon={Icon.Eye}
              target={<SessionDetail session={session} />}
            />
            <Action
              title="Resume in Terminal"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => resumeInTerminal(session)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={isFavourite ? "Remove Favourite" : "Add Favourite"}
              icon={isFavourite ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={onToggleFavourite}
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
          </ActionPanel.Section>
          <ActionPanel.Section>
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
            <Action.CopyToClipboard
              title="Copy Project Path"
              content={session.projectPath}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
