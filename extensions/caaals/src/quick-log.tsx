import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { addFavorite, getFavoriteFoods, getRecentFoods, logFood, removeFavorite } from "./api";
import type { Food, MealType } from "./types";
import {
  formatMacros,
  formatMealType,
  getDefaultMeal,
  getDefaultServing,
  MEAL_ICONS,
  MEALS,
  scaleNutrition,
} from "./utils";

export default function QuickLog() {
  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    const [favorites, recents] = await Promise.all([getFavoriteFoods(), getRecentFoods()]);
    const favoriteIds = new Set(favorites.map((f) => f.id));
    return {
      favorites,
      recents: recents.filter((f) => !favoriteIds.has(f.id)),
    };
  });

  async function handleLog(food: Food, meal: MealType) {
    const serving = getDefaultServing(food);
    const scaled = scaleNutrition(food.nutrition, serving, 1);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Logging ${food.name}...`,
    });
    try {
      await logFood(food, {
        servingId: serving.id,
        quantity: 1,
        meal,
        loggedAt: new Date().toISOString(),
      });
      toast.style = Toast.Style.Success;
      toast.title = `Logged ${food.name}`;
      toast.message = `${scaled.calories} kcal · ${MEAL_ICONS[meal]} ${formatMealType(meal)}`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Log";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    }
  }

  async function handleToggleFavorite(food: Food, isFavorite: boolean) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating favorites..." });
    try {
      if (isFavorite) {
        await removeFavorite(food.id);
        toast.title = "Removed from Favorites";
      } else {
        await addFavorite(food);
        toast.title = "Added to Favorites";
      }
      toast.style = Toast.Style.Success;
      revalidate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Update Favorites";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    }
  }

  const renderItem = (food: Food, isFavorite: boolean) => {
    const serving = getDefaultServing(food);
    const scaled = scaleNutrition(food.nutrition, serving, 1);
    const defaultMeal = getDefaultMeal();

    return (
      <List.Item
        key={`${isFavorite ? "fav" : "recent"}-${food.id}`}
        title={food.name}
        subtitle={food.brand ?? serving.description}
        icon={isFavorite ? Icon.Star : Icon.Clock}
        keywords={food.brand ? [food.brand] : undefined}
        accessories={[
          { text: formatMacros(scaled), tooltip: `Per ${serving.description}` },
          { text: `${scaled.calories} kcal` },
        ]}
        actions={
          <ActionPanel>
            <Action
              title={`Log to ${formatMealType(defaultMeal)}`}
              icon={Icon.Plus}
              onAction={() => handleLog(food, defaultMeal)}
            />
            <ActionPanel.Submenu title="Log to Meal" icon={Icon.Calendar}>
              {MEALS.map((m) => (
                <Action key={m} title={`${MEAL_ICONS[m]} ${formatMealType(m)}`} onAction={() => handleLog(food, m)} />
              ))}
            </ActionPanel.Submenu>
            <Action.Push
              title="Adjust and Log"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<AdjustAndLog food={food} />}
            />
            <Action
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={() => handleToggleFavorite(food, isFavorite)}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  };

  const isEmpty = data !== undefined && data.favorites.length === 0 && data.recents.length === 0;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter favorites and recent foods...">
      {isEmpty && (
        <List.EmptyView
          title="Nothing to Quick-Log Yet"
          description="Foods you log and favorite in Caaals will show up here"
        />
      )}
      {data && data.favorites.length > 0 && (
        <List.Section title="Favorites">{data.favorites.map((f) => renderItem(f, true))}</List.Section>
      )}
      {data && data.recents.length > 0 && (
        <List.Section title="Recents">{data.recents.map((f) => renderItem(f, false))}</List.Section>
      )}
    </List>
  );
}

function AdjustAndLog({ food }: { food: Food }) {
  const { pop } = useNavigation();
  const [quantityError, setQuantityError] = useState<string | undefined>();
  const servings = food.servings.length > 0 ? food.servings : [getDefaultServing(food)];

  async function handleSubmit(values: { quantity: string; servingId: string; meal: MealType }) {
    const quantity = parseFloat(values.quantity.replace(",", "."));
    if (Number.isNaN(quantity) || quantity <= 0 || quantity > 100) {
      setQuantityError("Enter a number between 0 and 100");
      return;
    }

    const serving = servings.find((s) => s.id === values.servingId) ?? servings[0]!;
    const scaled = scaleNutrition(food.nutrition, serving, quantity);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Logging ${food.name}...`,
    });
    try {
      await logFood(food, {
        servingId: serving.id,
        quantity,
        meal: values.meal,
        loggedAt: new Date().toISOString(),
      });
      toast.style = Toast.Style.Success;
      toast.title = `Logged ${food.name}`;
      toast.message = `${scaled.calories} kcal · ${MEAL_ICONS[values.meal]} ${formatMealType(values.meal)}`;
      pop();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Log";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <Form
      navigationTitle={food.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log to Diary" icon={Icon.Checkmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Food" text={`${food.name}${food.brand ? ` — ${food.brand}` : ""}`} />
      <Form.TextField
        id="quantity"
        title="Quantity"
        defaultValue="1"
        error={quantityError}
        onChange={() => {
          if (quantityError) setQuantityError(undefined);
        }}
      />
      <Form.Dropdown id="servingId" title="Serving">
        {servings.map((s) => (
          <Form.Dropdown.Item key={s.id} value={s.id} title={s.description} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="meal" title="Meal" defaultValue={getDefaultMeal()}>
        {MEALS.map((m) => (
          <Form.Dropdown.Item key={m} value={m} title={`${MEAL_ICONS[m]} ${formatMealType(m)}`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
