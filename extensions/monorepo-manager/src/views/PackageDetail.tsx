import { Detail } from '@raycast/api';
import { type Workspace } from '@yarnpkg/core';
import path from 'path';
import { useEffect, useState } from 'react';
import { WorkspaceManager } from '../packages/workspace-manager';
import fs from 'fs-extra';
import {
  renderJiraProjectLinkMarkdown,
  renderMembers,
  renderSlackChannelRedirectLinkMarkdown,
} from '../utils/markdown';
import { useSimplifiedTeamInfo } from '../utils/useTeamInfo';

interface Props {
  workspace: Workspace;
  workspaceRootInstance: WorkspaceManager | null;
}

/**
 * A view shows detail of a package/workspace.
 */
export function PackageDetail(props: Props) {
  const { workspace, workspaceRootInstance } = props;
  const [readmeDoc, setReadmeDoc] = useState('');
  const [mdContent, setMdContent] = useState('');

  const name = WorkspaceManager.getWorkspaceName(workspace) ?? 'unknown';
  const teamName = WorkspaceManager.getWorkspaceTeam(workspace);
  const version = WorkspaceManager.getWorkspaceVersion(workspace) ?? '0.0.0';

  const teamInfo = useSimplifiedTeamInfo(workspaceRootInstance, teamName);

  useEffect(() => {
    const markdownFilePath = path.resolve(workspace.cwd, 'README.md');

    fs.readFile(markdownFilePath, 'utf8', (error, data) => {
      if (!error && data) {
        setReadmeDoc(data as unknown as string);
      }
    });
  }, [workspace.cwd]);

  useEffect(() => {
    const markdown = [
      '## Package overview',
      `- **Package name** : ${name}`,
      `- **Version** : ${version}`,
      `- **Slack** : ${renderSlackChannelRedirectLinkMarkdown(teamInfo)}`,
      `- **Project** : ${renderJiraProjectLinkMarkdown(teamInfo)}`,
      `- **Team name** : ${teamName}`,
      `- **Responsible Individual** : ${
        teamInfo && teamInfo.directlyResponsibleIndividual ? teamInfo.directlyResponsibleIndividual : 'none'
      }`,
      `- **Members** \n: ${renderMembers(teamInfo)}`,
      readmeDoc,
    ];

    setMdContent(markdown.join('\n'));
  }, [teamInfo, readmeDoc]);

  return <Detail navigationTitle={`Detail of ${name}`} markdown={mdContent} />;
}
