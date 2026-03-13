import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { Remote } from "../../types";
import { useMemo } from "react";
import { RemoteHostIcon } from "../icons/RemoteHostIcons";
import { usePromise } from "@raycast/utils";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../actions/WorkspaceNavigationActions";
import { RemoteAddAction, RemoteDeleteAction, RemoteEditAction } from "../actions/RemoteActions";
import { CopyToClipboardMenuAction } from "../actions/CopyToClipboardMenuAction";

type RemoteConnectivity = {
  reachable: boolean;
  reason?: string;
};

export default function RemotesView(context: RepositoryContext & NavigationContext) {
  const items: Remote[] = Object.values(context.remotes.data);

  const {
    data: connectivity,
    isLoading: isChecking,
    revalidate: revalidateConnectivity,
  } = usePromise(
    async (repoPath: string, remoteHosts: string[]) => {
      const entries = await Promise.all(
        remoteHosts.map(async (remoteName) => {
          try {
            await context.gitManager.checkRemoteConnectivity(remoteName);
            return [remoteName, { reachable: true }] as const;
          } catch (error) {
            return [
              remoteName,
              { reachable: false, reason: error instanceof Error ? error.message : "Unknown error" },
            ] as const;
          }
        }),
      );

      return Object.fromEntries(entries) as Record<string, RemoteConnectivity>;
    },
    [context.gitManager.repoPath, items.map((remote) => remote.name)],
  );

  return (
    <List
      isLoading={isChecking}
      navigationTitle={context.gitManager.repoName}
      searchBarAccessory={WorkspaceNavigationDropdown(context)}
      actions={
        <ActionPanel>
          <SharedActionsSection onCheckAgain={revalidateConnectivity} {...context} />
        </ActionPanel>
      }
    >
      {!isChecking && items.length === 0 ? (
        <List.EmptyView
          title="No remotes"
          description="This repository has no remote configured."
          icon={Icon.Network}
        />
      ) : (
        items.map((remote: Remote) => (
          <RemoteListItem
            key={remote.name}
            remote={remote}
            {...context}
            connectivity={connectivity?.[remote.name]}
            isLoading={isChecking}
            onCheckAgain={revalidateConnectivity}
          />
        ))
      )}
    </List>
  );
}

function RemoteListItem(
  context: RepositoryContext &
    NavigationContext & {
      remote: Remote;
      connectivity?: RemoteConnectivity;
      isLoading: boolean;
      onCheckAgain: () => void;
    },
) {
  const accessories: List.Item.Accessory[] = useMemo(() => {
    const result = [];
    if (context.isLoading) {
      result.push({
        text: { value: "Checking Connectivity...", color: Color.SecondaryText },
      });
    } else if (context.connectivity) {
      result.push({
        tag: {
          value: context.connectivity.reachable ? "Online" : "Offline",
          color: context.connectivity.reachable ? Color.Green : Color.Red,
        },
        icon: Icon.Dot,
        tooltip: context.connectivity.reachable ? "Connection established via ls-remote" : context.connectivity.reason,
      });
    }

    return result;
  }, [context.connectivity, context.isLoading]);

  return (
    <List.Item
      key={context.remote.name}
      title={context.remote.name}
      subtitle={{
        value: context.remote.fetchUrl,
        tooltip: context.remote.fetchUrl,
      }}
      icon={RemoteHostIcon(context.remote)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={context.remote.name}>
            <Action.OpenInBrowser title="Open in Browser" url={context.remote.fetchUrl} icon={Icon.Link} />
            <RemoteEditAction initialRemote={context.remote} {...context} />

            <CopyToClipboardMenuAction
              contents={[
                { title: "Fetch URL", content: context.remote.fetchUrl, icon: Icon.Link },
                ...(context.remote.pushUrl !== context.remote.fetchUrl
                  ? [{ title: "Push URL", content: context.remote.pushUrl, icon: Icon.Link }]
                  : []),
              ]}
            />
            <RemoteDeleteAction {...context} />
          </ActionPanel.Section>
          <SharedActionsSection {...context} />
        </ActionPanel>
      }
    />
  );
}

function SharedActionsSection(
  context: RepositoryContext &
    NavigationContext & {
      onCheckAgain: () => void;
    },
) {
  return (
    <>
      <RemoteAddAction {...context} />
      <Action
        title="Check Again"
        onAction={context.onCheckAgain}
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <WorkspaceNavigationActions {...context} />
    </>
  );
}
