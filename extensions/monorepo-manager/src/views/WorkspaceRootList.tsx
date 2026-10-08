import { useMemo, type ReactNode } from 'react';
import { Action, ActionPanel, List, Icon } from '@raycast/api';
import { SimplifiedWorkspace } from '../types';
import orderBy from 'lodash/orderBy';
import { iconPackage } from '../utils/icons';
import { PackagesList } from './PackagesList';
import { getCommonActions, getOpenInEditorActions, getRareActions } from '../utils/actions';

interface Props {
  workspaces: SimplifiedWorkspace[];
  isLoading: boolean;
}
// If a workspace has `package.json` file, default action will be showing list of actions of that package.
// Otherwise, the default action will be showing in the Finder.
const getDefaultAction = (workspaceName: string, workspace: SimplifiedWorkspace): ReactNode =>
  workspace.hasPackageJsonFile ? (
    <Action.Push
      title="Show List of Packages"
      target={<PackagesList workspace={workspace} workspaceName={workspaceName} />}
      icon={Icon.Info}
    />
  ) : (
    <Action.ShowInFinder title="Open in Finder" path={workspace.path} />
  );

/**
 * A view shows list of workspace root to choose
 */
export function WorkspaceRootList(props: Props) {
  const { workspaces, isLoading } = props;

  const sortedWorkspaces = useMemo(() => {
    return orderBy(workspaces, ['hasPackageJsonFile'], ['desc']);
  }, [workspaces]);

  return (
    <List searchBarPlaceholder="Search your workspace to start searching packages inside it." isLoading={isLoading}>
      {sortedWorkspaces.map((it: SimplifiedWorkspace) => {
        const detailView = it.hasPackageJsonFile ? (
          ''
        ) : (
          <List.Item.Detail markdown="This workspace does not have a root `package.json` file." />
        );

        return (
          <List.Item
            key={it.name}
            title={it.name}
            subtitle={it.path}
            icon={it.hasPackageJsonFile ? iconPackage : Icon.Folder}
            detail={detailView}
            actions={
              <ActionPanel title={`Actions for this workspace "${it.name}":`}>
                <ActionPanel.Section>{getDefaultAction(it.name, it)}</ActionPanel.Section>
                <ActionPanel.Section>{getOpenInEditorActions(it.path)}</ActionPanel.Section>
                <ActionPanel.Section>{getCommonActions(it.path)}</ActionPanel.Section>
                <ActionPanel.Section>{getRareActions(it.path)}</ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
