import { Color, Icon, List } from "@raycast/api";

import { Project, Session } from "../types";
import { formatAccessoryDate, repoName } from "../utils";
import { SessionActions } from "./SessionActions";

interface SessionListItemProps {
  session: Session;
  project: Project | undefined;
  mutate: () => Promise<void>;
}

export function SessionListItem({ session, project, mutate }: SessionListItemProps) {
  const repo = project ? repoName(project.worktree) : undefined;
  const title = session.title || session.slug;

  const accessories: List.Item.Accessory[] = [];

  if (session.stats) {
    if (session.stats.cost > 0) {
      accessories.push({
        text: `$${session.stats.cost.toFixed(3)}`,
        tooltip: `Cost: $${session.stats.cost.toFixed(6)}`,
      });
    }

    if (session.stats.tokens > 0) {
      accessories.push({
        icon: { source: Icon.Coins, tintColor: Color.Yellow },
        text: `${session.stats.tokens}`,
        tooltip: `Tokens utilised: ${session.stats.tokens}`,
      });
    }

    if (session.stats.contextPercent !== undefined && session.stats.contextPercent > 0) {
      accessories.push({
        icon: { source: Icon.Brain, tintColor: Color.Blue },
        text: `${session.stats.contextPercent}`,
        tooltip: `Context utilised: ${session.stats.contextPercent} tokens`,
      });
    }
  }

  if (repo && project?.worktree !== "/") {
    accessories.push({ tag: repo });
  }

  accessories.push({
    text: formatAccessoryDate(session.time.updated),
    tooltip: `Last message: ${new Date(session.time.updated).toLocaleString()}`,
  });

  return (
    <List.Item
      id={session.id}
      title={title}
      keywords={[session.slug, repo ?? "", session.directory, session.id]}
      accessories={accessories}
      actions={<SessionActions session={session} project={project} mutate={mutate} />}
    />
  );
}
