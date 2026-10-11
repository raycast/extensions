import { MenuBarExtra, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useLocalStorageProgress } from "./hooks/use-local-storage-progress";
import { Progress } from "./types";
import { getIcon } from "./utils/icon";
import { getSubtitle } from "./utils/progress";
import { selectMenuBar } from "./utils/progress-store";

export default function Index() {
  const { state, reload } = useLocalStorageProgress();
  const current = state.allProgress.find((progress) => progress.id === state.currMenubarProgressId);

  const selectProgress = async (progress: Progress) => {
    try {
      await selectMenuBar(progress.id);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Menu Bar Selection",
        message: error instanceof Error ? error.message : String(error),
      });
      try {
        await reload();
      } catch {
        // The original storage failure is already displayed.
      }
      return;
    }
    try {
      await reload();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Selection Saved",
        message: "The menu bar could not refresh. Reopen the command to refresh.",
      });
    }
  };

  const renderProgress = (progress: Progress) => (
    <MenuBarExtra.Item
      key={progress.id}
      title={progress.menubar.title}
      tooltip={progress.title}
      subtitle={getSubtitle(progress.progressNum)}
      icon={getIcon(progress.progressNum)}
      onAction={() => selectProgress(progress)}
    />
  );

  return (
    <MenuBarExtra
      title={current ? `${current.menubar.title} ${current.progressNum}%` : "Nothing to Show"}
      icon={current ? getIcon(current.progressNum) : undefined}
      isLoading={state.isLoading}
    >
      {!state.isLoading && (
        <>
          <MenuBarExtra.Section title="Pinned Progress">
            {state.allProgress.filter((progress) => progress.menubar.shown && progress.pinned).map(renderProgress)}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="All Progress">
            {state.allProgress.filter((progress) => progress.menubar.shown && !progress.pinned).map(renderProgress)}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Open Preferences" onAction={openExtensionPreferences} />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
