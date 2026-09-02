import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { createMealPlanEntry } from "../api/mealplan";
import { addDays, formatDayLabel, toIsoDate } from "../lib/week";
import { PLAN_ENTRY_TYPES, type PlanEntryType, type RecipeSummary } from "../types";
import type { MealieClient } from "../api/client";

const DAYS_AHEAD = 21;

/** Die Standard-Mahlzeit. In den Live-Daten der Referenzinstanz war praktisch jeder Eintrag ein Abendessen. */
const DEFAULT_TYPE: PlanEntryType = "dinner";

export function PlanRecipeAction({ client, recipe }: { client: MealieClient; recipe: RecipeSummary }) {
  const { push } = useNavigation();
  return (
    <Action
      icon={Icon.Calendar}
      title="Add to Meal Plan"
      shortcut={{ modifiers: ["cmd"], key: "m" }}
      onAction={() => push(<PickDay client={client} recipe={recipe} />)}
    />
  );
}

function PickDay({ client, recipe }: { client: MealieClient; recipe: RecipeSummary }) {
  const { pop } = useNavigation();
  const days = Array.from({ length: DAYS_AHEAD }, (_, index) => addDays(new Date(), index));

  async function plan(date: Date, entryType: PlanEntryType) {
    const iso = toIsoDate(date);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding to meal plan" });
    try {
      await createMealPlanEntry(client, { date: iso, entryType, recipeId: recipe.id });
      toast.style = Toast.Style.Success;
      toast.title = "Planned for " + iso;
      toast.message = recipe.name + " as " + entryType;
      pop();
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not add the entry" });
    }
  }

  return (
    <List navigationTitle={"Plan " + recipe.name} searchBarPlaceholder="Pick a day">
      {days.map((day, index) => (
        <List.Item
          key={toIsoDate(day)}
          icon={Icon.Calendar}
          title={relativeLabel(index, day)}
          subtitle={toIsoDate(day)}
          actions={
            <ActionPanel>
              <Action icon={Icon.Plus} title="Plan as Dinner" onAction={() => plan(day, DEFAULT_TYPE)} />
              <ActionPanel.Submenu icon={Icon.Tag} title="Plan as Another Meal">
                {PLAN_ENTRY_TYPES.filter((type) => type !== DEFAULT_TYPE).map((type) => (
                  <Action key={type} title={capitalize(type)} onAction={() => plan(day, type)} />
                ))}
              </ActionPanel.Submenu>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function relativeLabel(index: number, day: Date): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return formatDayLabel(day);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
