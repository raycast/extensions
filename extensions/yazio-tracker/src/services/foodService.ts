// Business logic for food data processing
import type { Product, UserConsumedItem, RecipePortion, ConsumedItem } from "../types";

export interface ProcessedFoodData {
  groupedByDaytime: Record<string, ConsumedItem[]>;
}

export async function processFoodData(
  consumedItemsData: { products: UserConsumedItem[]; recipe_portions: RecipePortion[] },
  getProduct: (productId: string) => Promise<Product | null>,
): Promise<ProcessedFoodData> {
  // Process products with their details
  const productsWithDetails = (
    await Promise.all(
      consumedItemsData.products.map(async (item) => {
        const productDetails = await getProduct(item.product_id);
        if (!productDetails) return null; // skip missing products
        return { ...item, productDetails, type: "product" as const };
      }),
    )
  ).filter(Boolean) as Array<UserConsumedItem & { productDetails: Product; type: "product" }>;

  // Process recipes
  const formattedRecipes = consumedItemsData.recipe_portions.map(
    (recipe): ConsumedItem => ({
      ...recipe,
      id: recipe.id,
      name: recipe.name || "Recipe",
      portion_count: recipe.portion_count,
      type: "recipe" as const,
    }),
  );

  // Combine all items
  const allConsumedItems: ConsumedItem[] = [...productsWithDetails, ...formattedRecipes];

  // Group by meal type
  const groupedByDaytime = allConsumedItems.reduce(
    (acc, item) => {
      const daytime = item.daytime;
      if (!acc[daytime]) acc[daytime] = [];
      acc[daytime].push(item);
      return acc;
    },
    {} as Record<string, ConsumedItem[]>,
  );

  return { groupedByDaytime };
}

export function processMockFoodData(
  consumedItemsData: { products: UserConsumedItem[]; recipe_portions: RecipePortion[] },
  mockProducts: Record<string, Product>,
): ProcessedFoodData {
  // Process products with mock details
  const productsWithDetails = consumedItemsData.products.map((item) => {
    const productDetails = mockProducts[item.product_id as keyof typeof mockProducts];
    return { ...item, productDetails, type: "product" as const };
  });

  // Process recipes
  const formattedRecipes = consumedItemsData.recipe_portions.map(
    (recipe): ConsumedItem => ({
      ...recipe,
      id: recipe.id,
      name: recipe.name || "Recipe",
      portion_count: recipe.portion_count,
      type: "recipe" as const,
    }),
  );

  // Combine all items
  const allConsumedItems: ConsumedItem[] = [...productsWithDetails, ...formattedRecipes];

  // Group by meal type
  const groupedByDaytime = allConsumedItems.reduce(
    (acc, item) => {
      const daytime = item.daytime;
      if (!acc[daytime]) acc[daytime] = [];
      acc[daytime].push(item);
      return acc;
    },
    {} as Record<string, ConsumedItem[]>,
  );

  return { groupedByDaytime };
}
