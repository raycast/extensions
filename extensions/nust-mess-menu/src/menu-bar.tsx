import { Icon, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { SITE_URL, fetchTodayMenu } from "./lib/api";
import { MEAL_META, formatMealItems, getActiveMeal, mealHeadline } from "./lib/meals";
import { MEAL_NAMES, type TodayMenu } from "./lib/types";

export default function Command() {
  const [menu, setMenu] = useState<TodayMenu>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchTodayMenu()
      .then((data) => {
        if (!cancelled) {
          setMenu(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMenu(undefined);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const active = getActiveMeal();
  const activeMeal = menu?.meals[active.name];
  const title = menu ? `${MEAL_META[active.name].title}: ${mealHeadline(activeMeal)}` : "Mess";

  return (
    <MenuBarExtra icon={{ source: "icon.png" }} title={title} tooltip="NUST mess menu" isLoading={isLoading}>
      {MEAL_NAMES.map((name) => (
        <MenuBarExtra.Section key={name} title={MEAL_META[name].title}>
          <MenuBarExtra.Item
            title={formatMealItems(menu?.meals[name])}
            onAction={() => launchCommand({ name: "today", type: LaunchType.UserInitiated })}
          />
        </MenuBarExtra.Section>
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Today's Menu"
          icon={Icon.AppWindow}
          onAction={() => launchCommand({ name: "today", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Open Weekly Menu"
          icon={Icon.Calendar}
          onAction={() => launchCommand({ name: "weekly", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Open Website" icon={Icon.Globe} onAction={() => open(SITE_URL)} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
