import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  openExtensionPreferences,
  LaunchProps,
  LaunchType,
  List,
  launchCommand,
  environment,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { ComponentType } from "react";
import {
  bindCommandWorkspace,
  currentWorkspace,
  WorkspaceNotConfiguredError,
  resolveWorkspace,
} from "../lib/workspaces";

export function WorkspaceMetadata() {
  const workspace = currentWorkspace();
  if (!workspace) return null;
  const showOrganization =
    !workspace.organizationSlug ||
    workspace.organizationSlug.trim().toLowerCase() !== workspace.name.trim().toLowerCase();
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Workspace" text={workspace.name} />
      <Detail.Metadata.Label title="Server" text={workspace.baseUrl} />
      {showOrganization ? (
        <Detail.Metadata.Label title="Organization" text={workspace.organizationSlug ?? "Not Verified"} />
      ) : null}
    </Detail.Metadata>
  );
}

export function WorkspaceAction() {
  return (
    <Action
      title="Switch Workspace"
      icon={Icon.Building}
      shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
      onAction={() =>
        launchCommand({
          name: "workspaces",
          type: LaunchType.UserInitiated,
          context: { returnCommand: environment.commandName },
        })
      }
    />
  );
}

/** Loading the profile once keeps every child form and callback on the same account. */
export interface CommandLaunchContext {
  workspaceId?: string;
  integration?: string;
  owner?: "user" | "org";
  template?: string;
  label?: string;
  integrationSetup?: import("../lib/integration-setup").IntegrationSetupDefaults;
}

export function withWorkspace(Component: ComponentType<{ launchContext?: CommandLaunchContext }>) {
  return function WorkspaceCommand(props: LaunchProps<{ launchContext?: CommandLaunchContext }>) {
    const { data, isLoading, error } = usePromise(
      async (id?: string) => {
        try {
          const workspace = await resolveWorkspace(id);
          bindCommandWorkspace(workspace);
          return workspace;
        } catch (error) {
          if (!id && error instanceof WorkspaceNotConfiguredError) return null;
          throw error;
        }
      },
      [props.launchContext?.workspaceId],
    );
    if (data === undefined && !error) return <List isLoading={isLoading} />;
    if (data === null && !error)
      return (
        <List searchBarPlaceholder="Set up Executor">
          <List.EmptyView
            icon="extension_icon.png"
            title="Welcome to Executor"
            description="Connect a workspace to use its tools. Sign in to Executor, open API keys in your workspace, then add the key here."
            actions={
              <ActionPanel>
                <Action
                  title="Add Workspace"
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  onAction={() =>
                    launchCommand({
                      name: "workspaces",
                      type: LaunchType.UserInitiated,
                      context: { intent: "add", returnCommand: environment.commandName },
                    })
                  }
                />
                <Action.OpenInBrowser
                  title="Open Executor"
                  url="https://executor.sh"
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        </List>
      );
    if (!data)
      return (
        <Detail
          isLoading={isLoading}
          markdown={`# Choose a Workspace\n\n${error?.message ?? "Select a workspace to continue."}`}
          actions={
            <ActionPanel>
              <WorkspaceAction />
            </ActionPanel>
          }
        />
      );
    return <Component launchContext={props.launchContext} />;
  };
}
