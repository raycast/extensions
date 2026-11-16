import { Icon, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { useMenu } from "./lib/api";
import { SITE_URL } from "./lib/urls";
import { MEAL_TITLES, formatMealItems, getActiveMeal, mealHeadline, todayMeals, tomorrowMeals } from "./lib/meals";
import { MEAL_NAMES, type Menu } from "./lib/types";

function openToday() {
  return launchCommand({ name: "today", type: LaunchType.UserInitiated });
}

function menuBarTitle(menu: Menu | undefined): string {
  if (!menu) {
    return "Mess";
  }
  const active = getActiveMeal(menu);
  if (active.status === "closed") {
    return `Breakfast: ${mealHeadline(tomorrowMeals(menu).breakfast)}`;
  }
  return `${MEAL_TITLES[active.name]}: ${mealHeadline(todayMeals(menu)[active.name])}`;
}

export default function Command() {
  // Menu bar commands can't show toasts, so failures show up as a menu item instead.
  const { data, isLoading, error, revalidate } = useMenu({ onError: () => undefined });
  const closed = data ? getActiveMeal(data).status === "closed" : false;
  const meals = data ? todayMeals(data) : undefined;

  return (
    <MenuBarExtra
      icon={{ source: "icon.png" }}
      title={menuBarTitle(data)}
      tooltip="NUST mess menu"
      isLoading={isLoading}
    >
      {error ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Couldn't load the menu"
            subtitle={data ? "Showing the last one" : undefined}
            icon={Icon.Warning}
            onAction={() => revalidate()}
          />
        </MenuBarExtra.Section>
      ) : null}
      {data && closed ? (
        <MenuBarExtra.Section title="Tomorrow's Breakfast">
          <MenuBarExtra.Item title={formatMealItems(tomorrowMeals(data).breakfast)} onAction={openToday} />
        </MenuBarExtra.Section>
      ) : null}
      {meals
        ? MEAL_NAMES.map((name) => (
            <MenuBarExtra.Section key={name} title={MEAL_TITLES[name]}>
              <MenuBarExtra.Item title={formatMealItems(meals[name])} onAction={openToday} />
            </MenuBarExtra.Section>
          ))
        : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Today's Menu" icon={Icon.AppWindow} onAction={openToday} />
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
