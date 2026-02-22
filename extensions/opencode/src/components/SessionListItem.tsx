import { List, Action, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { Project, Session, SessionStats } from "../types";
import { repoName, formatCost, formatTokens } from "../utils";
import { loadSessionStats } from "../lib/storage";
import { SessionActions } from "./SessionActions";

interface SessionListItemProps {
  session: Session;
  project: Project | undefined;
  mutate: () => Promise<void>;
}

export function SessionListItem({ session, project, mutate }: SessionListItemProps) {
  const repo = project ? repoName(project.worktree) : undefined;
  const title = session.title || session.slug;

  const { data: stats, isLoading } = usePromise((sid) => loadSessionStats(sid), [session.id]);

  return (
    <List.Item
      id={session.id}
      title={title}
      keywords={[session.slug, repo ?? "", session.directory, session.id]}
      detail={<SessionItemDetail session={session} stats={stats} isLoading={isLoading} repo={repo} />}
      actions={
        <SessionActions session={session} project={project} mutate={mutate}>
          <Action.CopyToClipboard title="Copy Session ID" content={session.id} icon={Icon.CopyClipboard} />
        </SessionActions>
      }
    />
  );
}

function SessionItemDetail({
  session,
  stats,
  isLoading,
  repo,
}: {
  session: Session;
  stats?: SessionStats;
  isLoading: boolean;
  repo?: string;
}) {
  const CONTEXT_LIMIT = 1000000;
  const contextPercent = stats ? Math.round((stats.context / CONTEXT_LIMIT) * 100) : 0;

  const markdown = stats
    ? `
# ${session.title || session.slug}

**Context**
${formatTokens(stats.tokens)} tokens
${contextPercent}% used
${formatCost(stats.cost)} spent
  `
    : "";

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={session.title || session.slug} />
          <List.Item.Detail.Metadata.Label title="Directory" text={session.directory} />
          {repo && <List.Item.Detail.Metadata.Label title="Project" text={repo} />}
          <List.Item.Detail.Metadata.Label
            title="Last Activity"
            text={new Date(session.time.updated).toLocaleString()}
          />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Lines Added"
            text={stats ? stats.additions.toString() : "Loading..."}
          />
          <List.Item.Detail.Metadata.Label
            title="Lines Removed"
            text={stats ? stats.deletions.toString() : "Loading..."}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
