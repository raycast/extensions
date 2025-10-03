import { List } from "@raycast/api";

// Re-using the types from our main command
interface Product {
  id: string;
  name: string;
  producer: string | null;
  nutrients: {
    "energy.energy": number;
  };
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
                    text: `${item.calories}g`,
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
