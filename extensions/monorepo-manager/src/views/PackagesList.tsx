import { useState, useEffect } from 'react';
import { Action, ActionPanel, List, Icon, showToast, Toast } from '@raycast/api';
import type { SimplifiedWorkspace } from '../types';
import { iconPackage } from '../utils/icons';
import * as cached from '../utils/cache';
import { WorkspaceManager } from '../packages/workspace-manager';
import { PackageDetail } from './PackageDetail';
import type { Workspace } from '@yarnpkg/core';
import {
  getActionsForPackageWithTeam,
  getCommonActions,
  getOpenInEditorActions,
  getRareActions,
} from '../utils/actions';

interface Props {
  workspace: SimplifiedWorkspace;
  workspaceName: string;
}

/**
 * A view shows list of packages of a workspace.
 */
export function PackagesList(props: Props) {
  const { workspace, workspaceName } = props;

  const [isLoading, setIsLoading] = useState(true);
  const [wsManager, setWorkspaceManager] = useState<null | WorkspaceManager>(null);

  useEffect(() => {
    if (!workspace.hasPackageJsonFile) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid action in PackagesList',
        message: 'Cannot show packages in a workspace not having a `package.json` file',
      });
      return;
    }
    const workspaceRootPath = workspace.path;

    WorkspaceManager.initialize(workspaceRootPath).then((instance) => {
      setWorkspaceManager(instance);

      const packages = instance.getWorkspacePackages();
      // we cannot serialise whole `packages` object, so we need to cache only a simplified version.
      const simplifiedPackages = packages.map((it) => ({
        cwd: it.cwd,
        manifest: it.manifest,
      }));

      cached.set(cached.CacheKeys.LIST_PACKAGES, JSON.stringify(simplifiedPackages));

      setIsLoading(false);
    });
  }, [workspace.path]);

  const cachedListPackages = cached.get(cached.CacheKeys.LIST_PACKAGES);
  let packages: Workspace[] = [];

  if (cachedListPackages) {
    packages = JSON.parse(cachedListPackages);
  } else {
    packages = wsManager ? wsManager.getWorkspacePackages() : [];
  }

  return (
    <List
      searchBarPlaceholder={`There are ${packages.length} packages in ${workspaceName}`}
      navigationTitle={`Search package in ${workspaceName}`}
      isLoading={isLoading}
    >
      {packages.map((it) => {
        const name = WorkspaceManager.getWorkspaceName(it) ?? 'unknown';
        const path = it.cwd;
        const desc = WorkspaceManager.getWorkspaceDesc(it) ?? '';
        const teamName = WorkspaceManager.getWorkspaceTeam(it) ?? '';

        return (
          <List.Item
            key={name}
            title={name}
            subtitle={desc}
            icon={iconPackage}
            accessories={[{ text: `🧑‍🤝‍🧑: ${WorkspaceManager.getWorkspaceTeam(it)}` }]}
            detail={<List.Item.Detail markdown={`Hello World`} />}
            actions={
              <ActionPanel title={`Actions for this package: "${name}"`}>
                <ActionPanel.Section>
                  <Action.Push
                    title="See Package Details"
                    target={<PackageDetail workspace={it} workspaceRootInstance={wsManager} />}
                    icon={Icon.Info}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>{getOpenInEditorActions(path)}</ActionPanel.Section>

                <ActionPanel.Section>{getActionsForPackageWithTeam(teamName, it, wsManager)}</ActionPanel.Section>

                <ActionPanel.Section>{getCommonActions(path, wsManager?.$cwd)}</ActionPanel.Section>
                <ActionPanel.Section>{getRareActions(path)}</ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
