import {
  Action,
  ActionPanel,
  Icon,
  getPreferenceValues,
  getApplications,
  open,
  Application,
  Keyboard,
} from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { Preferences } from "../../types";
import { basename } from "path";

interface RepositoryDirectoryActionsProps {
  /** Path to the currently opened worktree directory. */
  currentWorktreePath: string;
  /** Shared settings key path (main repository path for linked worktrees). */
  repositoryRootPath: string;
  /** Callback called when repository is opened via any "Open" action */
  onOpen?: () => void;
}

/**
 * Reusable actions for working with repository as a directory.
 * Includes file system operations and opening in various applications.
 */
export function RepositoryDirectoryActions({
  currentWorktreePath,
  repositoryRootPath,
  onOpen,
}: RepositoryDirectoryActionsProps) {
  const preferences = getPreferenceValues<Preferences>();
  const { data: applications } = usePromise(() => getApplications(currentWorktreePath));
  const [defaultApp, setDefaultApp] = useCachedState<Application | undefined>(
    `${repositoryRootPath}:repo-default-app`,
    undefined,
  );

  async function handleRememberDefaultApp(app: Application) {
    await open(currentWorktreePath, app);
    onOpen?.();
    setDefaultApp(app);
  }

  function handleChangeDefault(app: Application) {
    setDefaultApp(app);
  }

  return (
    <ActionPanel.Section title={basename(currentWorktreePath)}>
      {defaultApp ? (
        <Action.Open
          key={defaultApp.bundleId || defaultApp.path}
          title={`Open Repository in ${defaultApp.name}`}
          icon={{ fileIcon: defaultApp.path }}
          application={defaultApp}
          target={currentWorktreePath}
          onOpen={() => onOpen?.()}
          shortcut={Keyboard.Shortcut.Common.OpenWith}
        />
      ) : (
        <ActionPanel.Submenu
          title="Open Repository in Default App"
          icon={Icon.AppWindow}
          shortcut={Keyboard.Shortcut.Common.OpenWith}
        >
          {applications?.map((app: Application) => (
            <Action
              key={app.path}
              title={app.name}
              icon={{ fileIcon: app.path }}
              onAction={() => {
                handleRememberDefaultApp(app);
              }}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      <Action.Open
        title={`Open Repository in ${preferences.defaultTerminal.name}`}
        target={currentWorktreePath}
        application={preferences.defaultTerminal}
        icon={{ fileIcon: preferences.defaultTerminal.path }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        onOpen={() => onOpen?.()}
      />
      {preferences.externalGitClient && (
        <Action.Open
          title={`Open Repository in ${preferences.externalGitClient.name}`}
          target={currentWorktreePath}
          application={preferences.externalGitClient}
          icon={{ fileIcon: preferences.externalGitClient.path }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
          onOpen={() => onOpen?.()}
        />
      )}
      <Action.OpenWith
        path={currentWorktreePath}
        title="Open Repository with…"
        onOpen={() => onOpen?.()}
        shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "o" }}
      />
      {defaultApp && (
        <ActionPanel.Submenu title="Change Repository Default App" icon={Icon.AppWindow}>
          {applications?.map((app: Application) => (
            <Action
              key={app.path}
              title={app.name}
              icon={{ fileIcon: app.path }}
              onAction={() => handleChangeDefault(app)}
            />
          ))}
        </ActionPanel.Submenu>
      )}
    </ActionPanel.Section>
  );
}

/**
 * Action for creating a quicklink for a repository.
 */
export function RepositoryQuickLinkAction({
  currentWorktreePath,
}: Pick<RepositoryDirectoryActionsProps, "currentWorktreePath">) {
  return (
    <Action.CreateQuicklink
      title="Create Quicklink"
      quicklink={{
        link: `${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/ernest0n/git/open-repository?arguments=${encodeURIComponent(JSON.stringify({ path: currentWorktreePath }))}`,
        name: `Show ${basename(currentWorktreePath)} in Git`,
      }}
    />
  );
}
