import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { deleteDiaryEntry, getDiaryByDate } from "./api";
import type { DailySummary, DiaryEntry } from "./types";
import {
  formatDate,
  formatDateSection,
  formatMealType,
  formatServingWithQuantity,
  getDefaultServing,
  MEAL_ICONS,
} from "./utils";

function getDatesForLastNDays(n: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}

export default function BrowseDiary() {
  const [summaries, setSummaries] = useState<DailySummary[] | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const fetchDiary = useCallback(async () => {
    setIsLoading(true);
    try {
      const dates = getDatesForLastNDays(7);
      const results = await Promise.allSettled(dates.map((d) => getDiaryByDate(d, { quiet: true })));
      const fulfilled = results
        .filter((r): r is PromiseFulfilledResult<DailySummary> => r.status === "fulfilled")
        .map((r) => r.value);

      if (fulfilled.length === 0 && results.some((r) => r.status === "rejected")) {
        const firstErr = (results.find((r) => r.status === "rejected") as PromiseRejectedResult).reason;
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load Diary",
          message: firstErr instanceof Error ? firstErr.message : "Unknown error",
        });
        setSummaries([]);
        return;
      }

      setSummaries(fulfilled.filter((s) => s.entries.length > 0));

      const failedCount = results.filter((r) => r.status === "rejected").length;
      if (failedCount > 0 && fulfilled.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Some days failed to load",
          message: `${failedCount} of ${results.length} days could not be fetched`,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiary();
  }, [fetchDiary]);

  async function handleDelete(entry: DiaryEntry) {
    if (
      await confirmAlert({
        title: "Delete Entry",
        message: `Remove "${entry.food.name}" from your diary?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting..." });
      try {
        await deleteDiaryEntry(entry.id);
        toast.style = Toast.Style.Success;
        toast.title = "Entry Deleted";
        await fetchDiary();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Delete Failed";
        toast.message = err instanceof Error ? err.message : "Unknown error";
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter diary entries...">
      {summaries !== undefined && summaries.length === 0 && (
        <List.EmptyView title="No Diary Entries" description="Nothing logged in the past 7 days" />
      )}
      {summaries?.map((summary) => (
        <List.Section
          key={summary.date}
          title={formatDateSection(summary.date)}
          subtitle={`${summary.totals.calories} kcal total`}
        >
          {summary.entries.map((entry) => {
            const serving = entry.food.servings.find((s) => s.id === entry.servingId) ?? getDefaultServing(entry.food);
            return (
              <List.Item
                key={entry.id}
                title={entry.food.name}
                subtitle={formatServingWithQuantity(serving, entry.quantity)}
                accessories={[
                  { text: `${entry.nutrition.calories} kcal` },
                  {
                    tag: {
                      value: `${MEAL_ICONS[entry.meal]} ${formatMealType(entry.meal)}`,
                      color: mealColor(entry.meal),
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push title="View Details" icon={Icon.Eye} target={<EntryDetail entry={entry} />} />
                    <Action
                      title="Copy Nutrition"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      onAction={async () => {
                        const n = entry.nutrition;
                        await Clipboard.copy(
                          `${entry.food.name}: ${n.calories} kcal | P: ${n.protein}g | C: ${n.carbs}g | F: ${n.fat}g`,
                        );
                        await showToast({ style: Toast.Style.Success, title: "Copied" });
                      }}
                    />
                    <Action
                      title="Delete Entry"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleDelete(entry)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function mealColor(meal: string): Color {
  switch (meal) {
    case "breakfast":
      return Color.Orange;
    case "lunch":
      return Color.Yellow;
    case "dinner":
      return Color.Blue;
    case "snack":
      return Color.Purple;
    default:
      return Color.SecondaryText;
  }
}

function EntryDetail({ entry }: { entry: DiaryEntry }) {
  const { food, nutrition, meal, quantity } = entry;
  const serving = food.servings.find((s) => s.id === entry.servingId) ?? getDefaultServing(food);
  const fn = food.nutrition;
  const multiplier = serving.multiplier * quantity;

  const markdown = `# ${food.name}${food.brand ? ` — ${food.brand}` : ""}

| Nutrient | Amount |
|----------|--------|
| Calories | **${nutrition.calories} kcal** |
| Protein | ${nutrition.protein}g |
| Carbs | ${nutrition.carbs}g |
| Fat | ${nutrition.fat}g |
${fn.fiber != null ? `| Fiber | ${Math.round(fn.fiber * multiplier * 10) / 10}g |` : ""}
${fn.sugar != null ? `| Sugar | ${Math.round(fn.sugar * multiplier * 10) / 10}g |` : ""}
${fn.sodium != null ? `| Sodium | ${Math.round(fn.sodium * multiplier * 10) / 10}mg |` : ""}

**Serving:** ${formatServingWithQuantity(serving, quantity)}
**Meal:** ${MEAL_ICONS[meal]} ${formatMealType(meal)}
**Logged:** ${new Date(entry.loggedAt).toLocaleString("en-US")}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Nutrition"
            icon={Icon.Clipboard}
            onAction={async () => {
              const n = nutrition;
              await Clipboard.copy(
                `${food.name}: ${n.calories} kcal | P: ${n.protein}g | C: ${n.carbs}g | F: ${n.fat}g`,
              );
              await showToast({ style: Toast.Style.Success, title: "Copied" });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
