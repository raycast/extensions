import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { Remote, Submodule } from "../../types";
import OpenRepository, { RepositoryContext, NavigationContext } from "../../open-repository";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../actions/WorkspaceNavigationActions";
import { useMemo } from "react";
import { GitManager } from "../../utils/git-manager";
import { useGitStatus } from "../../hooks/useGitStatus";
import { prettyPath } from "../../utils/path-utils";
import {
  SubmoduleAddAction,
  SubmodulesUpdateAllAction,
  SubmoduleDeleteAction,
  SubmoduleUpdateAction,
} from "../actions/SubmoduleActions";
import { RepositoryDirectoryActions, RepositoryQuickLinkAction } from "../actions/RepositoryDirectoryActions";
import { CopyToClipboardMenuAction } from "../actions/CopyToClipboardMenuAction";
import { useGitRemotes } from "../../hooks/useGitRemotes";
import { RemoteHostIcon } from "../icons/RemoteHostIcons";
import { useCachedPromise } from "@raycast/utils";
import { detectRepositoryLanguages } from "../../utils/language-detector";
import { RemoteWebPageAction } from "../actions/RemoteActions";

export default function SubmodulesView(context: RepositoryContext & NavigationContext) {
  return (
    <List
      isLoading={context.submodules.isLoading}
      navigationTitle={context.gitManager.repoName}
      searchBarPlaceholder="Search submodules..."
      searchBarAccessory={WorkspaceNavigationDropdown(context)}
      actions={
        <ActionPanel>
          <SubmoduleAddAction {...context} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => context.submodules.revalidate()} />
          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    >
      {context.submodules.error ? (
        <List.EmptyView
          title="Error loading submodules"
          description={context.submodules.error.message}
          icon={Icon.ExclamationMark}
        />
      ) : !context.submodules.isLoading && context.submodules.data.length === 0 ? (
        <List.EmptyView
          title="No submodules"
          description="This repository has no submodules."
          icon={`submodule-folder.svg`}
        />
      ) : (
        context.submodules.data.map((submodule: Submodule) => (
          <SubmoduleListItem key={submodule.fullPath} submodule={submodule} {...context} />
        ))
      )}
    </List>
  );
}

function SubmoduleListItem(
  context: RepositoryContext &
    NavigationContext & {
      submodule: Submodule;
    },
) {
  const gitManager = useMemo(() => new GitManager(context.submodule.fullPath), [context.submodule.fullPath]);
  const status = useGitStatus(gitManager);
  const remotes = useGitRemotes(gitManager);
  const stats = useCachedPromise(
    async (repositoryPath: string) => {
      const stats = await detectRepositoryLanguages(repositoryPath);
      return stats;
    },
    [context.submodule.fullPath],
    { initialData: [] },
  );

  const accessories: List.Item.Accessory[] = useMemo(() => {
    const result = [];

    const hasUncommittedChanges = status.data.files.length !== 0;
    if (hasUncommittedChanges) {
      result.push({
        tag: { value: "Uncommitted", color: Color.Orange },
        tooltip: "There are uncommitted changes",
      });
    }

    for (const remote of Object.values(remotes.data)) {
      result.push({
        tag: { value: remote.displayName },
        icon: RemoteHostIcon(remote),
        tooltip: `Hosted on ${remote.provider} at ${remote.displayName}`,
      });
    }

    return result;
  }, [remotes.data]);

  const icon: Image.ImageLike = useMemo(() => {
    if (stats.data && stats.data.length > 0 && stats.data[0].color) {
      return stats.data[0].color;
    }

    return { source: `submodule-folder.svg`, tintColor: Color.SecondaryText };
  }, [stats.data]);

  return (
    <List.Item
      id={context.submodule.fullPath}
      title={context.submodule.name}
      subtitle={{
        value: context.submodule.relativePath,
        tooltip: prettyPath(context.submodule.fullPath),
      }}
      icon={icon}
      keywords={[context.submodule.relativePath]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={context.submodule.name}>
            <Action.Push
              title="Show Repository"
              icon={Icon.Book}
              target={
                <OpenRepository
                  arguments={{
                    path: context.submodule.fullPath,
                    currentView: "commits",
                    shouldSaveVisit: false,
                  }}
                />
              }
            />
            <SubmoduleUpdateAction {...context} />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <CopyToClipboardMenuAction
              contents={[
                { title: "Name", content: context.submodule.name, icon: Icon.Clipboard },
                { title: "Relative Path", content: context.submodule.relativePath, icon: Icon.Folder },
                { title: "Absolute Path", content: context.submodule.fullPath, icon: Icon.Folder },
              ]}
            />
            <RepositoryAttachedLinksAction remotes={remotes.data} />
            <RepositoryQuickLinkAction repositoryPath={context.submodule.fullPath} />
            <SubmoduleDeleteAction {...context} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Submodules">
            <SubmoduleAddAction {...context} />
            <SubmodulesUpdateAllAction {...context} />
          </ActionPanel.Section>

          <RepositoryDirectoryActions repositoryPath={context.submodule.fullPath} />

          <ActionPanel.Section>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => context.submodules.revalidate()} />
          </ActionPanel.Section>
          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Action for opening the attached links of a branch.
 */
function RepositoryAttachedLinksAction({ remotes }: { remotes: Record<string, Remote> }) {
  return (
    <ActionPanel.Submenu title="Open Link to" icon={Icon.Link} shortcut={{ modifiers: ["cmd"], key: "l" }}>
      {Object.values(remotes).map((remote) => (
        <RemoteWebPageAction.Base
          key={`remote-web-page-other-${remote.name}`}
          remote={remote}
          showTitle={Object.values(remotes).length > 1}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
