import { List } from "@raycast/api";
import type { ConsumedItem } from "../types";
interface MealDetailProps {
  meal: string;
  items: ConsumedItem[];
}

export function MealDetail({ meal, items }: MealDetailProps) {
  return (
    <List navigationTitle={`${meal.charAt(0).toUpperCase() + meal.slice(1)}`}>
      {items.length > 0 ? (
        items.map((item) => {
          if (item.type === "product") {
            return (
              <List.Item
                key={item.id}
                title={item.productDetails?.name || "Unknown Product"}
                subtitle={item.productDetails?.producer || ""}
                accessories={[
                  {
                    text: `${Math.round((item.productDetails?.nutrients["energy.energy"] || 0) * item.amount)} kcal`,
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
                    text: `${item.calories == undefined ? "Unknown" : item.calories} kcal`,
                  },
                  {
                    text: `${item.portion_count} portion${item.portion_count > 1 ? "s" : ""}`,
                  },
                ]}
              />
            );
          }
        })
      ) : (
        <List.EmptyView title={`No food logged for ${meal}.`} />
      )}
    </List>
  );
}
