import { Icon, Image, MenuBarExtra, openCommandPreferences, updateCommandMetadata } from "@raycast/api";
import React, { useMemo } from "react";
import { LifeProgressType } from "./types/types";
import { buildMenubarContent, currentDate, currentTime } from "./utils/common-utils";
import { useLifeProgress } from "./hooks/useLifeProgress";

export default function LifeProgressMenubar() {
  const { data: lifeProgressData, isLoading } = useLifeProgress();

  const lifeProgresses: LifeProgressType[] = useMemo(() => {
    return lifeProgressData || [];
  }, [lifeProgressData]);

  const menubarContent = useMemo(() => {
    return buildMenubarContent(lifeProgresses);
  }, [lifeProgresses]);

  const menuBarLabel = useMemo(() => {
    let title = "Life Progress";
    let icon: Icon | Image = Icon.Clock;
    if (menubarContent) {
      title = menubarContent?.menuBarInfo.progress + " " + menubarContent?.menuBarInfo.title;
    }
    if (menubarContent) {
      icon = menubarContent?.menuBarInfo.icon;
    }
    return { title, icon };
  }, [menubarContent]);

  updateCommandMetadata({
    subtitle: menuBarLabel.title,
  }).then();

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={menuBarLabel.icon}
      title={menuBarLabel.title}
      tooltip={menuBarLabel.title}
    >
      <MenuBarExtra.Section>
        {menubarContent?.progressList.map((item) => {
          return (
            <MenuBarExtra.Item
              key={item.title}
              icon={item.icon}
              title={item.title}
              subtitle={item.progress}
              onAction={() => {}}
            />
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Clock} title={currentDate() + " " + currentTime()} onAction={() => {}} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Settings..."}
          icon={Icon.Gear}
          onAction={async () => {
            await openCommandPreferences();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
