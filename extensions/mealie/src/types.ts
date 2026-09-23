export const PLAN_ENTRY_TYPES = ["breakfast", "lunch", "dinner", "side", "snack", "drink", "dessert"] as const;
export type PlanEntryType = (typeof PLAN_ENTRY_TYPES)[number];

export interface MultiPurposeLabel {
  id: string;
  name: string;
  color: string;
}

export interface IngredientFood {
  id: string;
  name: string;
  pluralName: string | null;
  labelId: string | null;
  label: MultiPurposeLabel | null;
}

export interface IngredientUnit {
  id: string;
  name: string;
  abbreviation: string | null;
}

export interface RecipeTag {
  id: string;
  name: string;
  slug: string;
}

export interface RecipeSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  orgURL: string | null;
  rating: number | null;
  totalTime: string | null;
  lastMade: string | null;
  tags: RecipeTag[] | null;
  recipeCategory: RecipeTag[] | null;
}

export interface LabelSetting {
  labelId: string;
  position: number;
  label: MultiPurposeLabel;
}

export interface ShoppingList {
  id: string;
  name: string;
  labelSettings: LabelSetting[];
}

export interface ShoppingListItem {
  id: string;
  shoppingListId: string;
  checked: boolean;
  position: number;
  quantity: number;
  note: string | null;
  display: string;
  foodId: string | null;
  food: IngredientFood | null;
  labelId: string | null;
  label: MultiPurposeLabel | null;
  unitId: string | null;
  unit: IngredientUnit | null;
}

export interface ShoppingListDetail extends ShoppingList {
  listItems: ShoppingListItem[];
}

export interface MealPlanEntry {
  id: number;
  date: string;
  entryType: PlanEntryType;
  title: string;
  text: string;
  recipeId: string | null;
  recipe: RecipeSummary | null;
}
