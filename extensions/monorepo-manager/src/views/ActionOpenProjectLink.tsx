import { Action } from '@raycast/api';
import { useSimplifiedTeamInfo } from '../utils/useTeamInfo';
import type { WorkspaceManager } from '../packages/workspace-manager';
import type { Workspace } from '@yarnpkg/core';
import { iconJira } from '../utils/icons';
import { getJiraProjectLink } from '../utils/markdown';

interface Props {
  teamName: string;
  workspace: Workspace;
  workspaceRootInstance: WorkspaceManager | null;
}

export function ActionOpenProjectLink(props: Props) {
  const { teamName, workspaceRootInstance } = props;
  const teamInfo = useSimplifiedTeamInfo(workspaceRootInstance, teamName);

  const jiraProjectLink = getJiraProjectLink(teamInfo);

  if (!teamName || !jiraProjectLink) {
    return null;
  }

  return <Action.OpenInBrowser title="Open Jira Project Link" icon={iconJira} url={jiraProjectLink} />;
}
