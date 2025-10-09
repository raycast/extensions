import { Action, ActionPanel, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { yazio } from "./utils/yazio";
import { MealDetail } from "./components/MealDetail";
import { ErrorView } from "./components/ErrorView";
import { formatDate } from "./utils/utils";
import { DateDropdown } from "./components/DateDropdown";
import { isDevelopment, mockConsumedItems, mockProducts } from "./utils/mockData";
import type { UserConsumedItem, RecipePortion, ConsumedItem } from "./types";
export default function Command() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const isDevMode = isDevelopment(); // Cache the development state

  const { isLoading, data, error } = useCachedPromise(
    async (date) => {
      if (isDevMode) {
        // Return mock data in development mode
        const consumedItemsData = mockConsumedItems;

        const productsWithDetails = consumedItemsData.products.map((item) => {
          const productDetails = mockProducts[item.product_id as keyof typeof mockProducts];
          return { ...item, productDetails, type: "product" as const };
        });

        const formattedRecipes = consumedItemsData.recipe_portions.map(
          (recipe): ConsumedItem => ({
            ...recipe,
            id: recipe.id,
            name: recipe.name || "Recipe",
            portion_count: recipe.portion_count,
            type: "recipe" as const,
          }),
        );

        const allConsumedItems: ConsumedItem[] = [...productsWithDetails, ...formattedRecipes];

        const groupedByDaytime = allConsumedItems.reduce(
          (acc, item) => {
            const daytime = item.daytime;
            if (!acc[daytime]) acc[daytime] = [];
            acc[daytime].push(item);
            return acc;
          },
          {} as Record<string, ConsumedItem[]>,
        );

        return groupedByDaytime;
      }

      try {
        const consumedItemsData = await yazio.user.getConsumedItems({ date });

        const productsWithDetails = await Promise.all(
          (consumedItemsData.products as UserConsumedItem[]).map(async (item) => {
            const productDetails = await yazio.products.get(item.product_id);
            return { ...item, productDetails, type: "product" as const };
          }),
        );
        const formattedRecipes = (consumedItemsData.recipe_portions as RecipePortion[]).map(
          (recipe): ConsumedItem => ({
            ...recipe,
            id: recipe.id,
            name: recipe.name || "Recipe",
            portion_count: recipe.portion_count,
            type: "recipe" as const,
          }),
        );

        const allConsumedItems: ConsumedItem[] = [...productsWithDetails, ...formattedRecipes];

        const groupedByDaytime = allConsumedItems.reduce(
          (acc, item) => {
            const daytime = item.daytime;
            if (!acc[daytime]) acc[daytime] = [];
            acc[daytime].push(item);
            return acc;
          },
          {} as Record<string, ConsumedItem[]>,
        );

        return groupedByDaytime;
      } catch (error) {
        if (error instanceof Error && error.message.includes("oauth/token")) {
          throw new Error("Please check your Yazio credentials in extension preferences");
        }
        throw error;
      }
    },
    [selectedDate],
  );

  const mealOrder = ["breakfast", "lunch", "dinner", "snack"];

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={<DateDropdown selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}
    >
      <ErrorView error={error} />

      {data &&
        mealOrder.map((meal) => (
          <List.Item
            key={meal}
            title={meal.charAt(0).toUpperCase() + meal.slice(1)}
            accessories={[{ text: `${data?.[meal]?.length || 0} items` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`View ${meal.charAt(0).toUpperCase() + meal.slice(1)}`}
                  target={<MealDetail meal={meal} items={data?.[meal] || []} />}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
