import { Action, ActionPanel, getApplications, Icon, Keyboard, open, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { editorLabel, otherEditor } from "../actions/apps";
import { EDITOR_TARGETS, findApplication } from "../actions/editor";
import type { EditorId } from "../preferences/types";
import type { RepositoryRecord, RepositoryUserData } from "../types/repository";

/**
 * The action panel for a repository row. This component is a thin, declarative
 * wrapper over Raycast's built-in actions plus a few imperative `open` calls; it
 * contains no business logic and is exercised manually inside Raycast.
 */
export interface RepositoryActionsProps {
  readonly record: RepositoryRecord;
  readonly userData: RepositoryUserData;
  readonly primaryEditor: EditorId;
  readonly terminalApp: string;
  /** Called after any action that "opens" the repo, to update recency/frequency. */
  readonly onOpen: (path: string) => void;
  readonly onToggleFavorite: (path: string) => void;
  readonly onTogglePin: (path: string) => void;
  readonly onRefresh: () => void;
  /** Open the in-extension search-folder manager. */
  readonly onManageRoots: () => void;
}

/**
 * Open a repository in an editor by resolving the actually-installed application
 * (by bundle id / name) rather than trusting a display-name string. Surfaces a
 * clear toast when the editor is not installed or the open fails — never fails
 * silently.
 */
async function openInEditor(path: string, editor: EditorId, onOpen: (path: string) => void): Promise<void> {
  try {
    const apps = await getApplications();
    const app = findApplication(EDITOR_TARGETS[editor], apps);
    if (!app) {
      await showToast({
        style: Toast.Style.Failure,
        title: `${editorLabel(editor)} not found`,
        message: `Install ${editorLabel(editor)}, or pick a different editor in RepoScout preferences.`,
      });
      return;
    }
    await open(path, app);
    onOpen(path);
  } catch (error) {
    await showFailureToast(error, { title: `Could not open in ${editorLabel(editor)}` });
  }
}

/** Open a path with a named app (Finder/terminal), surfacing failures as toasts. */
async function openWithApp(
  path: string,
  app: string | undefined,
  onOpen: (path: string) => void,
  failureTitle: string,
): Promise<void> {
  try {
    await open(path, app);
    onOpen(path);
  } catch (error) {
    await showFailureToast(error, { title: failureTitle });
  }
}

export function RepositoryActions(props: RepositoryActionsProps): React.JSX.Element {
  const { record, userData, primaryEditor, terminalApp, onOpen } = props;
  const secondaryEditor = otherEditor(primaryEditor);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title={`Open in ${editorLabel(primaryEditor)}`}
          icon={Icon.Code}
          onAction={() => openInEditor(record.path, primaryEditor, onOpen)}
        />
        <Action
          title={`Open in ${editorLabel(secondaryEditor)}`}
          icon={Icon.Code}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
          onAction={() => openInEditor(record.path, secondaryEditor, onOpen)}
        />
        <Action.ShowInFinder path={record.path} onShow={() => onOpen(record.path)} />
        <Action
          title="Open in Terminal"
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          onAction={() => openWithApp(record.path, terminalApp, onOpen, `Could not open in ${terminalApp}`)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Repository Path"
          content={record.path}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
        {record.remoteUrl ? (
          <Action.CopyToClipboard
            title="Copy Git Remote"
            content={record.remoteUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        ) : null}
        {record.remoteWebUrl ? (
          <Action.OpenInBrowser
            title="Open Remote on Web"
            url={record.remoteWebUrl}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />
        ) : null}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={userData.favorite ? "Remove from Favorites" : "Add to Favorites"}
          icon={userData.favorite ? Icon.StarDisabled : Icon.Star}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() => props.onToggleFavorite(record.path)}
        />
        <Action
          title={userData.pinned ? "Unpin Repository" : "Pin Repository"}
          icon={userData.pinned ? Icon.PinDisabled : Icon.Pin}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={() => props.onTogglePin(record.path)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh Index"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            props.onRefresh();
            void showHUD("Refreshing repositories…");
          }}
        />
        <Action
          title="Manage Search Folders"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          onAction={props.onManageRoots}
        />
        {record.branch ? (
          <Action.CopyToClipboard title="Copy Current Branch" icon={Icon.Checkmark} content={record.branch} />
        ) : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
