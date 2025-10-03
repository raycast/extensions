import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { yazio } from "./utils/yazio";

const formatDate = (date: Date) => date.toISOString().split("T")[0];

// --- (Type definitions remain the same) ---
interface Product {
  id: string;
  name: string;
  producer: string | null;
  nutrients: { "energy.energy": number };
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
type ConsumedItem =
  | (UserConsumedItem & { productDetails?: Product | null; type: "product" })
  | (RecipePortion & { type: "recipe" });

export default function Command() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  // The unused 'error' variable has been removed from this line
  const { isLoading, data } = usePromise(
    async (date) => {
      const consumedItemsData = await yazio.user.getConsumedItems({ date });

      const productsWithDetails = await Promise.all(
        (consumedItemsData.products as UserConsumedItem[]).map(async (item) => {
          const productDetails = await yazio.products.get(item.product_id);
          return { ...item, productDetails, type: "product" as const };
        }),
      );

      // The 'any' type has been replaced with the specific 'RecipePortion' type
      const formattedRecipes = (consumedItemsData.recipe_portions as RecipePortion[]).map(
        (recipe): ConsumedItem => ({
          ...recipe,
          id: recipe.id,
          name: "Recipe",
          calories: recipe.portion_count,
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
    },
    [selectedDate],
  );

  const DateDropdown = () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(today.getDate() - 2);
    return (
      <List.Dropdown tooltip="Select a date" value={selectedDate} onChange={(newValue) => setSelectedDate(newValue)}>
        <List.Dropdown.Item title="Today" value={formatDate(today)} />
        <List.Dropdown.Item title="Yesterday" value={formatDate(yesterday)} />
        <List.Dropdown.Item
          title={twoDaysAgo.toLocaleDateString(undefined, { weekday: "long" })}
          value={formatDate(twoDaysAgo)}
        />
      </List.Dropdown>
    );
  };

  const mealOrder = ["breakfast", "lunch", "dinner", "snack"];

  return (
    <List isLoading={isLoading} searchBarAccessory={<DateDropdown />}>
      {data && Object.keys(data).length > 0 ? (
        mealOrder.map(
          (meal) =>
            data[meal] &&
            data[meal].length > 0 && (
              <List.Section title={meal.charAt(0).toUpperCase() + meal.slice(1)} key={meal}>
                {data[meal].map((item) => {
                  if (item.type === "product") {
                    return (
                      <List.Item
                        key={item.id}
                        title={item.productDetails?.name || "Unknown Product"}
                        subtitle={item.productDetails?.producer || ""}
                        accessories={[
                          {
                            text: `${Math.round(
                              (item.productDetails?.nutrients["energy.energy"] || 0) * item.amount,
                            )} kcal`,
                          },
                          { text: `${item.amount}g` },
                        ]}
                      />
                    );
                  } else {
                    // item.type === 'recipe'
                    return (
                      <List.Item
                        key={item.id}
                        title={item.name}
                        subtitle="Consumed from a recipe"
                        accessories={[
                          {
                            text: `${item.calories}g`,
                          },
                        ]}
                      />
                    );
                  }
                })}
              </List.Section>
            ),
        )
      ) : (
        <List.EmptyView title="No food logged for this day." />
      )}
    </List>
  );
}
