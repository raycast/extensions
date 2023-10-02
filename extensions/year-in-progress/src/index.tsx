import { MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useLocalStorageProgress } from "./hooks/use-local-storage-progress";
import { getIcon } from "./utils/icon";
import { Progress, getSubtitle } from "./utils/progress";

export default function Command() {
  const [state, setState] = useLocalStorageProgress();
  const currMenubarProgress = state.allProgress.find((p) => p.key === state.currMenubarProgressKey);

  const onUpdateCurrMenubarKey = (progress: Progress) => {
    setState((prev) => ({ ...prev, currMenubarProgressKey: progress.key }));
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
                  key={progress.key}
                  title={progress.title}
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
                  key={progress.key}
                  title={progress.title}
                  subtitle={`${getSubtitle(progress.progressNum)}`}
                  icon={getIcon(progress.progressNum)}
                  onAction={() => {
                    onUpdateCurrMenubarKey(progress);
                  }}
                />
              ))}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item key={"preferences"} title="Preferences..." onAction={openExtensionPreferences} />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
