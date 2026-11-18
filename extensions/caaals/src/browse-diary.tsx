import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { addFavorite, copyMeal, deleteDiaryEntry, getDiarySummary, logFood, updateDiaryEntry } from "./api";
import type { DailySummary, DiaryEntry, Food, MealType } from "./types";
import {
  daysAgo,
  formatDate,
  formatDateSection,
  formatMealType,
  formatServingWithQuantity,
  getDefaultServing,
  MEAL_ICONS,
  MEALS,
  mealColor,
} from "./utils";

export default function BrowseDiary() {
  const {
    data: summaries,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => {
    const days = await getDiarySummary(daysAgo(6), formatDate(new Date()));
    // Newest first, skip empty days.
    return days.filter((d) => d.entries.length > 0).sort((a, b) => b.date.localeCompare(a.date));
  });

  async function handleDelete(entry: DiaryEntry) {
    if (
      await confirmAlert({
        title: "Delete Entry",
        message: `Remove "${entryTitle(entry)}" from your diary?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting..." });
      try {
        await deleteDiaryEntry(entry.id);
        toast.style = Toast.Style.Success;
        toast.title = "Entry Deleted";
        revalidate();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Delete Failed";
        toast.message = err instanceof Error ? err.message : "Unknown error";
      }
    }
  }

  async function handleConfirm(entry: DiaryEntry) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Confirming..." });
    try {
      await updateDiaryEntry(entry.id, { status: "confirmed" });
      toast.style = Toast.Style.Success;
      toast.title = "Entry Confirmed";
      toast.message = "Now counts toward your daily totals";
      revalidate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Confirm Failed";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    }
  }

  async function handleChangeMeal(entry: DiaryEntry, meal: MealType) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Moving entry..." });
    try {
      await updateDiaryEntry(entry.id, { meal });
      toast.style = Toast.Style.Success;
      toast.title = `Moved to ${formatMealType(meal)}`;
      revalidate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update Failed";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    }
  }

  async function handleLogAgain(entry: DiaryEntry) {
    if (!entry.food) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Log Yet",
        message: "This entry is still analyzing",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Logging..." });
    try {
      await logFood(entry.food, {
        foodKey: entry.foodKey,
        servingId: entry.servingId,
        quantity: entry.quantity,
        meal: entry.meal,
        loggedAt: new Date().toISOString(),
      });
      toast.style = Toast.Style.Success;
      toast.title = `Logged ${entry.food.name} today`;
      toast.message = `${entry.nutrition?.calories ?? 0} kcal`;
      revalidate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Log";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    }
  }

  async function handleCopyMealToToday(date: string, meal: MealType) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Copying ${formatMealType(meal).toLowerCase()}...`,
    });
    try {
      const copies = await copyMeal({ fromDate: date, toDate: formatDate(new Date()), meal });
      toast.style = Toast.Style.Success;
      toast.title = `Copied ${formatMealType(meal)} to Today`;
      toast.message = `${copies.length} ${copies.length === 1 ? "entry" : "entries"}`;
      revalidate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Copy Failed";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    }
  }

  async function handleAddFavorite(entry: DiaryEntry) {
    if (!entry.food) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Add Favorite Yet",
        message: "This entry is still analyzing",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding to favorites..." });
    try {
      await addFavorite(entry.food);
      toast.style = Toast.Style.Success;
      toast.title = "Added to Favorites";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Add Favorite";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    }
  }

  const today = formatDate(new Date());

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter diary entries...">
      {summaries !== undefined && summaries.length === 0 && (
        <List.EmptyView title="No Diary Entries" description="Nothing logged in the past 7 days" />
      )}
      {summaries?.map((summary) => (
        <List.Section key={summary.date} title={formatDateSection(summary.date)} subtitle={sectionSubtitle(summary)}>
          {summary.entries.map((entry) => {
            const food = entry.food;
            return (
              <List.Item
                key={entry.id}
                title={entryTitle(entry)}
                subtitle={entrySubtitle(entry)}
                accessories={[
                  ...(entry.status === "needs_confirmation"
                    ? [{ tag: { value: "Needs review", color: Color.Yellow } }]
                    : []),
                  ...(entry.status === "analyzing"
                    ? [{ tag: { value: "Analyzing", color: Color.SecondaryText } }]
                    : []),
                  { text: `${entry.nutrition?.calories ?? 0} kcal` },
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
                    {entry.status === "needs_confirmation" && (
                      <Action title="Confirm Entry" icon={Icon.CheckCircle} onAction={() => handleConfirm(entry)} />
                    )}
                    {food && (
                      <Action
                        title="Log Again Today"
                        icon={Icon.Plus}
                        shortcut={{ modifiers: ["cmd"], key: "l" }}
                        onAction={() => handleLogAgain(entry)}
                      />
                    )}
                    <ActionPanel.Submenu
                      title="Change Meal"
                      icon={Icon.Calendar}
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                    >
                      {MEALS.filter((m) => m !== entry.meal).map((m) => (
                        <Action
                          key={m}
                          title={`${MEAL_ICONS[m]} ${formatMealType(m)}`}
                          onAction={() => handleChangeMeal(entry, m)}
                        />
                      ))}
                    </ActionPanel.Submenu>
                    {summary.date !== today && (
                      <Action
                        title={`Copy ${formatMealType(entry.meal)} to Today`}
                        icon={Icon.Duplicate}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        onAction={() => handleCopyMealToToday(summary.date, entry.meal)}
                      />
                    )}
                    {food && (
                      <Action
                        title="Add to Favorites"
                        icon={Icon.Star}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                        onAction={() => handleAddFavorite(entry)}
                      />
                    )}
                    {food && (
                      <Action
                        title="Copy Nutrition"
                        icon={Icon.Clipboard}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                        onAction={async () => {
                          const n = entry.nutrition;
                          await Clipboard.copy(
                            `${food.name}: ${n.calories} kcal | P: ${n.protein}g | C: ${n.carbs}g | F: ${n.fat}g`,
                          );
                          await showToast({ style: Toast.Style.Success, title: "Copied" });
                        }}
                      />
                    )}
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={revalidate}
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

function sectionSubtitle(summary: DailySummary): string {
  const goal = summary.goals.calories;
  const calories = `${summary.totals.calories}${goal ? ` / ${goal}` : ""} kcal`;
  const score = summary.score?.value != null ? ` · Score ${summary.score.value}` : "";
  return `${calories}${score}`;
}

function entryTitle(entry: DiaryEntry): string {
  return entry.food?.name ?? entry.analysisText ?? "Analyzing...";
}

function entrySubtitle(entry: DiaryEntry): string {
  if (!entry.food) {
    return entry.status === "analyzing" ? "Analyzing..." : "Food details unavailable";
  }
  return formatServingWithQuantity(entryServing(entry.food, entry.servingId), entry.quantity);
}

function entryServing(food: Food, servingId: string) {
  return food.servings.find((s) => s.id === servingId) ?? getDefaultServing(food);
}

function EntryDetail({ entry }: { entry: DiaryEntry }) {
  const { food, nutrition, meal } = entry;
  const n = nutrition;

  if (!food) {
    return (
      <Detail
        markdown={`# ${entryTitle(entry)}\n\n> This entry is still analyzing.`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text={entry.status} />
            <Detail.Metadata.TagList title="Meal">
              <Detail.Metadata.TagList.Item
                text={`${MEAL_ICONS[meal]} ${formatMealType(meal)}`}
                color={mealColor(meal)}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Logged" text={new Date(entry.loggedAt).toLocaleString()} />
          </Detail.Metadata>
        }
      />
    );
  }

  const markdown = `# ${food.name}${food.brand ? ` — ${food.brand}` : ""}${
    entry.status === "needs_confirmation" ? "\n\n> ⚠️ This entry needs review before it counts toward your totals." : ""
  }`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Calories" text={`${n.calories} kcal`} />
          <Detail.Metadata.Label title="Protein" text={`${n.protein} g`} />
          <Detail.Metadata.Label title="Carbs" text={`${n.carbs} g`} />
          <Detail.Metadata.Label title="Fat" text={`${n.fat} g`} />
          <Detail.Metadata.Label title="Fiber" text={`${n.fiber} g`} />
          <Detail.Metadata.Label title="Sugar" text={`${n.sugar} g`} />
          <Detail.Metadata.Label title="Sodium" text={`${n.sodium} mg`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Serving"
            text={formatServingWithQuantity(entryServing(food, entry.servingId), entry.quantity)}
          />
          <Detail.Metadata.TagList title="Meal">
            <Detail.Metadata.TagList.Item
              text={`${MEAL_ICONS[meal]} ${formatMealType(meal)}`}
              color={mealColor(meal)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Logged" text={new Date(entry.loggedAt).toLocaleString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Copy Nutrition"
            icon={Icon.Clipboard}
            onAction={async () => {
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
