import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { yazio } from "./utils/yazio";
import { MealDetail } from "./components/MealDetail";
import { ErrorView } from "./components/ErrorView";
import { formatDate } from "./utils/utils";
import { DateDropdown } from "./components/DateDropdown";
import { isDevelopment, mockConsumedItems, mockProducts } from "./utils/mockData";
import { processFoodData, processMockFoodData } from "./services/foodService";
import { MEAL_TYPES } from "./constants";
import type { UserConsumedItem, RecipePortion } from "./types";
export default function Command() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const isDevMode = isDevelopment(); // Cache the development state

  const { isLoading, data, error } = useCachedPromise(
    async (date) => {
      if (isDevMode) {
        // Return mock data in development mode
        const consumedItemsData = mockConsumedItems;

        return processMockFoodData(consumedItemsData, mockProducts).groupedByDaytime;
      }

      try {
        const consumedItemsData = await yazio.user.getConsumedItems({ date });

        const productsWithDetails = await Promise.all(
          (consumedItemsData.products as UserConsumedItem[]).map(async (item) => {
            const productDetails = await yazio.products.get(item.product_id);
            return { ...item, productDetails, type: "product" as const };
          }),
        );

        return processFoodData(
          {
            products: productsWithDetails as unknown as UserConsumedItem[],
            recipe_portions: consumedItemsData.recipe_portions as RecipePortion[],
          },
          async (productId) => yazio.products.get(productId),
        ).then((res) => res.groupedByDaytime);
      } catch (error) {
        if (error instanceof Error && error.message.includes("oauth/token")) {
          throw new Error("Please check your Yazio credentials in extension preferences");
        }
        throw error;
      }
    },
    [selectedDate],
  );

  const mealOrder = [...MEAL_TYPES];

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
                  icon={Icon.List}
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
