import { Color, List } from "@raycast/api";

import { OpenSession } from "../hooks/useSessions";
import { Project, Session } from "../types";
import { formatRelativeTime, repoName } from "../utils";
import { SessionActions } from "./SessionActions";

interface SessionListItemProps {
  session: Session;
  project: Project | undefined;
  liveness: OpenSession["liveness"] | undefined;
  mutate: () => Promise<void>;
}

function livenessTag(liveness: OpenSession["liveness"] | undefined): List.Item.Accessory | null {
  if (liveness === "active") return { tag: { value: "Active", color: Color.Green } };
  if (liveness === "open") return { tag: { value: "Open", color: Color.Blue } };
  return null;
}

export function SessionListItem({ session, project, liveness, mutate }: SessionListItemProps) {
  const repo = project ? repoName(project.worktree) : undefined;
  const title = session.title || session.slug;

  const accessories: List.Item.Accessory[] = [];

  if (repo && project?.worktree !== "/") {
    accessories.push({ tag: repo });
  }

  const tag = livenessTag(liveness);
  if (tag) accessories.push(tag);

  accessories.push({
    text: formatRelativeTime(session.time.updated),
    tooltip: `Last message: ${new Date(session.time.updated).toLocaleString()}`,
  });

  return (
    <List.Item
      id={session.id}
      title={title}
      subtitle={session.directory}
      keywords={[session.slug, repo ?? "", session.directory, session.id]}
      accessories={accessories}
      actions={<SessionActions session={session} project={project} liveness={liveness} mutate={mutate} />}
    />
  );
}
