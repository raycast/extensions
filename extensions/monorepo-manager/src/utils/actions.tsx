import { Action, Icon } from '@raycast/api';
import { Workspace } from '@yarnpkg/core';
import type { WorkspaceManager } from '../packages/workspace-manager';
import * as cached from '../utils/cache';
import { ActionOpenProjectLink } from '../views/ActionOpenProjectLink';
import { ActionOpenSlackLink } from '../views/ActionOpenSlackLink';
import { GITHUB_ISSUE_URL } from './constants';
import { getGitRemoteUrl, parseGitRemoteURL } from './gits';
import { iconGit, iconSublimeText, iconVSCode } from './icons';

export function getCommonActions(path: string, rootPath?: string) {
  return [
    <Action.ShowInFinder
      key="open-in-finder"
      title="Open in Finder"
      path={path}
      shortcut={{ modifiers: ['cmd'], key: 'o' }}
    />,
    <Action.CopyToClipboard
      key="copy-path"
      title="Copy Path"
      content={path}
      icon={Icon.CopyClipboard}
      shortcut={{ modifiers: ['cmd'], key: 'c' }}
    />,
    <Action.Open
      key="open-in-terminal"
      application="com.apple.Terminal"
      title="Open in Terminal"
      target={path}
      icon={Icon.Terminal}
      shortcut={{ modifiers: ['cmd'], key: 't' }}
    />,
    <Action.OpenWith
      key="open-with"
      title="Open With..."
      path={path}
      icon={Icon.AppWindow}
      shortcut={{ modifiers: ['cmd'], key: 'o' }}
    />,

    getGitRemoteUrl(rootPath || path) ? (
      <Action.OpenInBrowser
        key="open-in-remote"
        title="Open Remote URL"
        icon={iconGit}
        url={parseGitRemoteURL(rootPath || path)}
        shortcut={{ modifiers: ['cmd'], key: 'r' }}
      />
    ) : null,
  ];
}

/**
 * We expect these actions are rare to be triggered by users.
 * Therefore, we don't want to add shortcuts for these actions.
 */
export function getRareActions(path: string) {
  return [
    <Action.OpenInBrowser key="submit-feedback" title="Submit Feedback" url={GITHUB_ISSUE_URL} icon={Icon.Stars} />,
    <Action.Trash key="trash" title="Move to Trash" paths={path} icon={Icon.Trash} />,
    <Action key="clear-cache" title="Clear Cache" onAction={cached.clear} icon={Icon.Circle} />,
  ];
}

export function getOpenInEditorActions(path: string) {
  return [
    <Action.Open
      key="open-in-vs-code"
      application="Visual Studio Code"
      title="Open in Visual Studio Code"
      target={path}
      icon={iconVSCode}
      // Note: Open in VSCode is always a 2nd position in list of actions.
      shortcut={{ modifiers: ['cmd'], key: 'enter' }}
    />,
    <Action.Open
      key="open-in-sublime-text"
      application="Sublime Text"
      title="Open in Sublime Text"
      target={path}
      icon={iconSublimeText}
      shortcut={{ modifiers: ['cmd'], key: 's' }}
    />,
  ];
}

export function getActionsForPackageWithTeam(
  teamName: string,
  ws: Workspace,
  wsManagerInstance: WorkspaceManager | null
) {
  return [
    <ActionOpenSlackLink
      key="open-slack-link"
      teamName={teamName}
      workspace={ws}
      workspaceRootInstance={wsManagerInstance}
    />,
    <ActionOpenProjectLink
      key="open-project-link"
      teamName={teamName}
      workspace={ws}
      workspaceRootInstance={wsManagerInstance}
    />,
  ];
}
