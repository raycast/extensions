import { Icon, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { useCachedProgressState } from "./hooks";
import { Progress } from "./types";
import { getIcon } from "./utils/icon";
import { getProgressNumber, getProgressSubtitle, getYear } from "./utils/progress";

function buildMenubarTitle(progress: Progress) {
  return {
    title: progress?.menubarTitle ?? undefined,
    progressNumber: getProgressNumber(progress) ?? 0,
  };
}

export default function Command() {
  const [userProgress] = useCachedProgressState();
  const menubarProgress = userProgress.filter((progress) => progress.showInMenuBar);
  const latestMenubarProgress = menubarProgress[0];

  const [menubarTitle, setMenubarTitle] = useCachedState("menubarTitle", buildMenubarTitle(latestMenubarProgress));

  useEffect(() => {
    const isExistInMenubarProgress =
      menubarProgress.findIndex((progress) => progress.menubarTitle === menubarTitle.title) !== -1;
    if (!isExistInMenubarProgress) {
      setMenubarTitle(buildMenubarTitle(latestMenubarProgress));
    }
  }, [menubarProgress, latestMenubarProgress, buildMenubarTitle]);

  return (
    <MenuBarExtra
      title={menubarTitle.title ? `${menubarTitle.title} ${menubarTitle.progressNumber}%` : "Nothing to show"}
      icon={getIcon(menubarTitle.progressNumber)}
    >
      <MenuBarExtra.Section title={`🔵 ${getYear()}`}>
        {menubarProgress.map((progress) => {
          const progressNumber = progress ? getProgressNumber(progress) : 0;
          const subtitle = getProgressSubtitle(progressNumber);
          return (
            <MenuBarExtra.Item
              key={progress.key}
              title={progress.menubarTitle || progress.title}
              icon={getIcon(progressNumber)}
              subtitle={subtitle}
              onAction={() => {
                setMenubarTitle({ title: progress.menubarTitle, progressNumber });
              }}
            />
          );
        })}
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
