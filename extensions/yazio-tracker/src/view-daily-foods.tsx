import { Action, ActionPanel, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { yazio } from "./utils/yazio";
import { MealDetail } from "./components/MealDetail";
import { formatDate } from "./utils/utils";
import { DateDropdown } from "./components/DateDropdown";

// --- (Keep the same type definitions here) ---
interface Product {
  id: string;
  name: string;
  producer: string | null;
  nutrients: { "energy.energy": number; };
}
interface UserConsumedItem {
  id: string;
  product_id: string;
  daytime: "breakfast" | "lunch" | "dinner" | "snack";
  amount: number;
}
interface RecipePortion {
  id: string;
  recipe_id: string;
  daytime: "breakfast" | "lunch" | "dinner" | "snack";
  portion_count: number;
  name: string;
  calories: number;
}
type ConsumedItem = (UserConsumedItem & { productDetails?: Product | null; type: "product" }) | (RecipePortion & { type: "recipe" });


export default function Command() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  const { isLoading, data } = usePromise(
    async (date) => {
      const consumedItemsData = await yazio.user.getConsumedItems({ date });

      const productsWithDetails = await Promise.all(
        (consumedItemsData.products as UserConsumedItem[]).map(async (item) => {
          const productDetails = await yazio.products.get(item.product_id);
          return { ...item, productDetails, type: "product" as const };
        })
      );
      console.log(productsWithDetails);
      const formattedRecipes = (consumedItemsData.recipe_portions as RecipePortion[]).map(
        (recipe): ConsumedItem => ({
          ...recipe,
          id: recipe.id,
          name: "Recipe",
          portion_count: recipe.portion_count,
          type: "recipe" as const,
        })
      );

      const allConsumedItems: ConsumedItem[] = [...productsWithDetails, ...formattedRecipes];

      const groupedByDaytime = allConsumedItems.reduce((acc, item) => {
        const daytime = item.daytime;
        if (!acc[daytime]) acc[daytime] = [];
        acc[daytime].push(item);
        return acc;
      }, {} as Record<string, ConsumedItem[]>);

      return groupedByDaytime;
    },
    [selectedDate]
  );


  const mealOrder = ["breakfast", "lunch", "dinner", "snack"];

  return (
    <List isLoading={isLoading} searchBarAccessory={<DateDropdown selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}>
      {mealOrder.map((meal) => (
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