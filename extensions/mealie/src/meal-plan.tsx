import { useState } from "react";
import { Action, ActionPanel, Alert, Icon, List, confirmAlert, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ConfigErrorView } from "./components/ConfigErrorView";
import { RecipePicker } from "./components/RecipePicker";
import { useGroupSlug, useMealie } from "./hooks/useMealie";
import { createMealPlanEntry, deleteMealPlanEntry, getMealPlan, updateMealPlanEntry } from "./api/mealplan";
import { addDays, formatDayLabel, startOfWeek, toIsoDate, weekDays } from "./lib/week";
import { recipeWebUrl } from "./lib/urls";
import { PLAN_ENTRY_TYPES, type MealPlanEntry } from "./types";

export default function MealPlan() {
  const { client, config, configError } = useMealie();
  const { push } = useNavigation();
  const groupSlug = useGroupSlug(client);
  const [monday, setMonday] = useState(() => startOfWeek(new Date()));

  const days = weekDays(monday);
  const from = toIsoDate(days[0]!);
  const to = toIsoDate(days[6]!);

  const { data, isLoading, revalidate } = useCachedPromise(
    (start: string, end: string) => getMealPlan(client!, start, end),
    [from, to],
    {
      execute: client !== undefined,
      initialData: [] as MealPlanEntry[],
      keepPreviousData: true,
      onError: (error) => {
        showFailureToast(error, { title: "Could not load the meal plan" });
      },
    },
  );

  if (configError) return <ConfigErrorView error={configError} />;

  async function run(action: () => Promise<unknown>, failureTitle: string) {
    try {
      await action();
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: failureTitle });
    }
  }

  function addEntry(date: string) {
    push(
      <RecipePicker
        client={client!}
        navigationTitle={"Add to " + date}
        onPick={(recipe) =>
          run(
            () => createMealPlanEntry(client!, { date, entryType: "dinner", recipeId: recipe.id }),
            "Could not add the entry",
          )
        }
        onPickFreeText={(title) =>
          run(() => createMealPlanEntry(client!, { date, entryType: "dinner", title }), "Could not add the entry")
        }
      />,
    );
  }

  async function confirmDelete(entry: MealPlanEntry) {
    const confirmed = await confirmAlert({
      title: "Remove this entry?",
      message: entryTitle(entry) + " on " + entry.date,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) await run(() => deleteMealPlanEntry(client!, entry.id), "Could not remove the entry");
  }

  const weekActions = (
    <>
      <Action
        icon={Icon.ArrowLeft}
        title="Previous Week"
        shortcut={{ modifiers: ["cmd"], key: "[" }}
        onAction={() => setMonday((current) => addDays(current, -7))}
      />
      <Action
        icon={Icon.ArrowRight}
        title="Next Week"
        shortcut={{ modifiers: ["cmd"], key: "]" }}
        onAction={() => setMonday((current) => addDays(current, 7))}
      />
      <Action
        icon={Icon.Calendar}
        title="Current Week"
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={() => setMonday(startOfWeek(new Date()))}
      />
    </>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder={"Filter meals from " + from + " to " + to}>
      {days.map((day) => {
        const iso = toIsoDate(day);
        const entries = data.filter((entry) => entry.date === iso);
        return (
          <List.Section key={iso} title={formatDayLabel(day)} subtitle={iso}>
            {entries.length === 0 && (
              <List.Item
                icon={Icon.Plus}
                title="Nothing planned"
                actions={
                  <ActionPanel>
                    <Action icon={Icon.Plus} title="Add Entry" onAction={() => addEntry(iso)} />
                    {weekActions}
                  </ActionPanel>
                }
              />
            )}
            {entries.map((entry) => (
              <List.Item
                key={entry.id}
                icon={entry.recipe ? Icon.Book : Icon.Pencil}
                title={entryTitle(entry)}
                accessories={[{ tag: entry.entryType }]}
                actions={
                  <ActionPanel>
                    {entry.recipe && groupSlug && (
                      <Action.OpenInBrowser
                        title="Open in Mealie"
                        url={recipeWebUrl(config!.baseUrl, groupSlug, entry.recipe.slug)}
                      />
                    )}
                    <Action icon={Icon.Plus} title="Add Entry" onAction={() => addEntry(iso)} />
                    <ActionPanel.Submenu icon={Icon.Tag} title="Change Meal Type…">
                      {PLAN_ENTRY_TYPES.map((type) => (
                        <Action
                          key={type}
                          title={capitalize(type)}
                          onAction={() =>
                            run(
                              () => updateMealPlanEntry(client!, entry, { entryType: type }),
                              "Could not change the meal type",
                            )
                          }
                        />
                      ))}
                    </ActionPanel.Submenu>
                    <Action
                      icon={Icon.ArrowRight}
                      title="Move to Next Day"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
                      onAction={() =>
                        run(
                          () =>
                            updateMealPlanEntry(client!, entry, {
                              date: toIsoDate(addDays(new Date(entry.date + "T12:00:00"), 1)),
                            }),
                          "Could not move the entry",
                        )
                      }
                    />
                    <Action
                      icon={Icon.Trash}
                      title="Remove Entry"
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => confirmDelete(entry)}
                    />
                    {weekActions}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function entryTitle(entry: MealPlanEntry): string {
  return entry.recipe?.name || entry.title || "Untitled";
}
