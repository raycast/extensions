import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import type { ProjectInfo } from "../lib/types.js";
import { shortenPath } from "../lib/formatters.js";
import { discoverSessions } from "../lib/claude-data.js";
import { openInFinder, openInVSCode } from "../lib/actions.js";
import { useFavourites } from "../lib/favourites.js";
import SessionListItem from "./SessionListItem.js";

type Props = {
  project: ProjectInfo;
};

function ProjectSessions({ project }: { project: ProjectInfo }) {
  const sessions = useMemo(
    () => discoverSessions(project.encodedPath),
    [project.encodedPath],
  );
  const { isFavourite, toggleFavourite } = useFavourites();

  return (
    <List isShowingDetail searchBarPlaceholder="Filter sessions...">
      {sessions.map((session) => (
        <SessionListItem
          key={session.filePath}
          session={session}
          isFavourite={isFavourite(session.sessionId)}
          onToggleFavourite={() => toggleFavourite(session.sessionId)}
        />
      ))}
    </List>
  );
}

export default function ProjectListItem({ project }: Props) {
  const accessories: List.Item.Accessory[] = [
    { text: `${project.sessionCount} sessions` },
  ];
  if (project.lastActivity) {
    accessories.push({
      date: project.lastActivity,
      tooltip: project.lastActivity.toLocaleString(),
    });
  }

  return (
    <List.Item
      title={project.displayName}
      subtitle={shortenPath(project.decodedPath)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="Browse Sessions"
            icon={Icon.List}
            target={<ProjectSessions project={project} />}
          />
          <Action
            title="Open in Finder"
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() => openInFinder(project.decodedPath)}
          />
          <Action
            title="Open in VS Code"
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            onAction={() => openInVSCode(project.decodedPath)}
          />
          <Action.CopyToClipboard
            title="Copy Project Path"
            content={project.decodedPath}
          />
        </ActionPanel>
      }
    />
  );
}
