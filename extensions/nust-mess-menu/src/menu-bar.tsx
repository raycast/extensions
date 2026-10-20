import { Icon, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { SITE_URL, fetchTodayMenu, fetchWeekMenu } from "./lib/api";
import { MEAL_META, formatMealItems, getActiveMeal, mealHeadline, tomorrowWeekday } from "./lib/meals";
import { MEAL_NAMES, type DayMeals } from "./lib/types";

function openToday() {
  return launchCommand({ name: "today", type: LaunchType.UserInitiated });
}

function menuBarTitle(meals: DayMeals | undefined, tomorrow: DayMeals | undefined): string {
  const active = getActiveMeal();
  if (active.status === "closed") {
    return tomorrow ? `Breakfast: ${mealHeadline(tomorrow.breakfast)}` : "Dinner's over";
  }
  return meals ? `${MEAL_META[active.name].title}: ${mealHeadline(meals[active.name])}` : "Mess";
}

// Menu bar commands can't show toasts, so failures show up as a menu item instead.
const silent = { onError: () => undefined };

export default function Command() {
  const closed = getActiveMeal().status === "closed";
  const tomorrow = tomorrowWeekday();
  const today = useCachedPromise(fetchTodayMenu, [], silent);
  const week = useCachedPromise(fetchWeekMenu, [], { ...silent, execute: closed && tomorrow !== undefined });

  const meals = today.data?.meals;
  const tomorrowMeals = closed && tomorrow ? week.data?.menu[tomorrow] : undefined;

  return (
    <MenuBarExtra
      icon={{ source: "icon.png" }}
      title={menuBarTitle(meals, tomorrowMeals)}
      tooltip="NUST mess menu"
      isLoading={today.isLoading || week.isLoading}
    >
      {today.error ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Couldn't load the menu"
            subtitle={meals ? "Showing the last one" : undefined}
            icon={Icon.Warning}
            onAction={() => today.revalidate()}
          />
        </MenuBarExtra.Section>
      ) : null}
      {tomorrowMeals ? (
        <MenuBarExtra.Section title="Tomorrow's Breakfast">
          <MenuBarExtra.Item title={formatMealItems(tomorrowMeals.breakfast)} onAction={openToday} />
        </MenuBarExtra.Section>
      ) : null}
      {meals
        ? MEAL_NAMES.map((name) => (
            <MenuBarExtra.Section key={name} title={MEAL_META[name].title}>
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
