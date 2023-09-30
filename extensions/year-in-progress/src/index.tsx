import { MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useCallback } from "react";
import { useCachedProgressState } from "./hooks";
import { Progress } from "./types";
import { getIcon } from "./utils/icon";
import { getProgressNumber, getProgressSubtitle } from "./utils/progress";

function buildMenubarTitle(progress: Progress) {
  return {
    title: progress?.menubarTitle ?? undefined,
    progressNumber: getProgressNumber(progress) ?? 0,
  };
}

export default function Command() {
  const [userProgress, setUserProgress] = useCachedProgressState();
  const allMenubarProgress = userProgress.filter((progress) => progress.showInMenuBar);
  const currentMenubarProgress = allMenubarProgress.filter((progress) => progress.isCurrentMenubarProgress)[0];
  const menubarTitle = buildMenubarTitle(currentMenubarProgress);

  const renderProgress = useCallback(
    (progress: Progress) => {
      const progressNumber = progress ? getProgressNumber(progress) : 0;
      const subtitle = getProgressSubtitle(progressNumber);
      return (
        <MenuBarExtra.Item
          key={progress.key}
          title={progress.menubarTitle || progress.title}
          icon={getIcon(progressNumber)}
          subtitle={subtitle}
          onAction={() => {
            setUserProgress(() => {
              return userProgress.map((p) => ({
                ...p,
                isCurrentMenubarProgress: p.key === progress.key ? true : false,
              }));
            });
          }}
        />
      );
    },
    [getProgressNumber, getProgressSubtitle, getIcon]
  );

  return (
    <MenuBarExtra
      title={menubarTitle.title ? `${menubarTitle.title} ${menubarTitle.progressNumber}%` : "Nothing to show"}
      icon={getIcon(menubarTitle.progressNumber)}
    >
      <MenuBarExtra.Section title={`🟢 Pinned Progress`}>
        {allMenubarProgress.filter((p) => p.pinned).map(renderProgress)}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title={`🔵 All Progress`}>
        {allMenubarProgress.filter((p) => !p.pinned).map(renderProgress)}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          key={"preferences"}
          title="Preferences..."
          onAction={async () => {
            await openExtensionPreferences();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
