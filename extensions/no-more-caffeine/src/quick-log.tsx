import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useRef } from "react";
import type { DrinkPreset } from "./types";
import { getDrinkPresets, servingDescription } from "./utils/drinkPresets";
import { getCustomDrinks, getFavoriteIds, saveIntake, setFavorite } from "./utils/storage";

export default function QuickLog() {
  const { data: customDrinks, isLoading: loadingDrinks } = useCachedPromise(getCustomDrinks);
  const { data: favorites = [], isLoading: loadingFavorites, revalidate } = useCachedPromise(getFavoriteIds);
  const presets = getDrinkPresets(customDrinks);
  const saving = useRef(false);

  async function log(drink: DrinkPreset) {
    if (saving.current) return;
    saving.current = true;
    try {
      await saveIntake({
        id: randomUUID(),
        timestamp: new Date(),
        amount: drink.defaultCaffeineMg,
        drinkType: drink.name,
        amountDescription: servingDescription(drink.servingMl),
      });
      await showToast({
        style: Toast.Style.Success,
        title: `Logged ${drink.name}`,
        message: `${drink.defaultCaffeineMg} mg`,
      });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Couldn’t log drink", message: String(error) });
    } finally {
      saving.current = false;
    }
  }

  async function changeFavorite(drink: DrinkPreset, favorite: boolean) {
    try {
      await setFavorite(drink.id, favorite);
      await revalidate();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Couldn’t update favorites", message: String(error) });
    }
  }

  function drinkRow(drink: DrinkPreset) {
    const favorite = favorites.includes(drink.id);
    return (
      <List.Item
        key={drink.id}
        icon={favorite ? Icon.Star : Icon.Mug}
        title={drink.name}
        subtitle={servingDescription(drink.servingMl)}
        accessories={[{ text: `${drink.defaultCaffeineMg} mg` }]}
        actions={
          <ActionPanel>
            <Action title={`Log ${drink.name} Now`} icon={Icon.Plus} onAction={() => log(drink)} />
            <Action
              title={favorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={Icon.Star}
              onAction={() => changeFavorite(drink, !favorite)}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={loadingDrinks || loadingFavorites} searchBarPlaceholder="Search drinks to log…">
      <List.Section title="Favorites">{presets.filter(({ id }) => favorites.includes(id)).map(drinkRow)}</List.Section>
      <List.Section title="Presets">{presets.filter(({ id }) => !favorites.includes(id)).map(drinkRow)}</List.Section>
    </List>
  );
}
