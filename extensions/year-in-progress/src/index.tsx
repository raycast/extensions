import { MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useLocalStorageProgress } from "./hooks/use-local-storage-progress";
import { Progress } from "./types";
import { getIcon } from "./utils/icon";
import { getSubtitle } from "./utils/progress";

export default function Index() {
  const [state, setState] = useLocalStorageProgress();
  const currMenubarProgress = state.allProgress.find((p) => p.title === state.currMenubarProgressTitle);

  const onUpdateCurrMenubarKey = (progress: Progress) => {
    setState((prev) => ({ ...prev, currMenubarProgressTitle: progress.title }));
  };

  return (
    <MenuBarExtra
      title={
        currMenubarProgress
          ? `${currMenubarProgress.menubar.title} ${currMenubarProgress.progressNum}%`
          : "Nothing to show"
      }
      icon={currMenubarProgress ? getIcon(currMenubarProgress.progressNum) : undefined}
      isLoading={state.isLoading}
    >
      {state.isLoading ? null : (
        <>
          <MenuBarExtra.Section title={`🟢 Pinned Progress`}>
            {state.allProgress
              .filter((p) => p.menubar.shown)
              .filter((p) => p.pinned)
              .map((progress) => (
                <MenuBarExtra.Item
                  key={progress.title}
                  title={progress.menubar.title as string}
                  subtitle={`${getSubtitle(progress.progressNum)}`}
                  icon={getIcon(progress.progressNum)}
                  onAction={() => {
                    onUpdateCurrMenubarKey(progress);
                  }}
                />
              ))}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title={`🔵 All Progress`}>
            {state.allProgress
              .filter((p) => p.menubar.shown)
              .filter((p) => !p.pinned)
              .map((progress) => (
                <MenuBarExtra.Item
                  key={progress.title}
                  title={progress.menubar.title as string}
                  tooltip={progress.title}
                  subtitle={`${getSubtitle(progress.progressNum)}`}
                  icon={getIcon(progress.progressNum)}
                  onAction={() => {
                    onUpdateCurrMenubarKey(progress);
                  }}
                />
              ))}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              key={"preferences"}
              title="Open Preferences"
              onAction={openExtensionPreferences}
              shortcut={{ modifiers: ["cmd"], key: "," }}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
