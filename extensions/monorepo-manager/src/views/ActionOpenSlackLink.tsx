import { Action } from '@raycast/api';
import { useSimplifiedTeamInfo } from '../utils/useTeamInfo';
import { getSlackChannelRedirectLink } from '../utils/markdown';
import type { WorkspaceManager } from '../packages/workspace-manager';
import type { Workspace } from '@yarnpkg/core';
import { useState, useEffect } from 'react';
import { iconSlack } from '../utils/icons';

interface Props {
  teamName: string;
  workspace: Workspace;
  workspaceRootInstance: WorkspaceManager | null;
}

export function ActionOpenSlackLink(props: Props) {
  const { teamName, workspaceRootInstance } = props;
  const [slackLink, setSlackLink] = useState('');
  const teamInfo = useSimplifiedTeamInfo(workspaceRootInstance, teamName);

  useEffect(() => {
    const slackLink = getSlackChannelRedirectLink(teamInfo);
    setSlackLink(slackLink);
  }, [teamInfo]);

  if (!teamName || !teamInfo || !slackLink) {
    return null;
  }

  return <Action.OpenInBrowser title="Open Slack Channel" icon={iconSlack} url={slackLink} />;
}
