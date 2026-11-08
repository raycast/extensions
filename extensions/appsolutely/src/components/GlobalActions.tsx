import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard } from "@raycast/api";
import { useLauncherState } from "../hooks/useLauncherState";
import { applicationStore } from "../services/applications";
import { emptyState } from "../models/folder";
import { FolderForm } from "./FolderForm";
import { AppBrowser } from "./AppBrowser";
import { useViewMode } from "../hooks/useViewMode";
import { perform } from "./feedback";
import { nextViewMode, VIEW_MODE_LABELS } from "../services/view-preference";

export function GlobalActions({ folderId }: { folderId: string | null }) {
  const { update, status, retry } = useLauncherState();
  const { mode, isLoading: viewLoading, setMode } = useViewMode();
  const nextMode = nextViewMode(mode);

  async function reset() {
    if (
      await confirmAlert({
        title: "Reset Appsolutely Layout?",
        message: "All folders will be removed and every app will return to Home. Your installed applications are kept.",
        primaryAction: { title: "Reset Layout", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await perform("Could Not Reset Layout", () => update(emptyState));
    }
  }

  return (
    <>
      <ActionPanel.Section title="Appsolutely">
        {status === "ready" ? (
          <Action.Push
            title={folderId ? "Create Subfolder" : "Create Folder"}
            icon={Icon.NewFolder}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<FolderForm parentId={folderId} />}
          />
        ) : (
          <Action title="Retry Loading Layout" icon={Icon.ArrowClockwise} onAction={retry} />
        )}
        <Action.Push
          title="Search All Applications"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          target={<AppBrowser folderId={folderId} searchMode />}
        />
        <Action
          title="Refresh Applications"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={applicationStore.refresh}
        />
        {!viewLoading && (
          <Action
            title={`Switch to ${VIEW_MODE_LABELS[nextMode]} View`}
            icon={
              nextMode === "list"
                ? Icon.List
                : nextMode === "grid-large"
                  ? Icon.AppWindowGrid2x2
                  : Icon.AppWindowGrid3x3
            }
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={() => perform("Could Not Save View", () => setMode(nextMode))}
          />
        )}
      </ActionPanel.Section>
      {status === "ready" && (
        <ActionPanel.Section>
          <Action title="Reset Layout" icon={Icon.Trash} style={Action.Style.Destructive} onAction={reset} />
        </ActionPanel.Section>
      )}
    </>
  );
}
