export interface IngredientResult {
  name: string;
  isVegan: boolean | null;
  surelyVegan: boolean;
  maybeVegan: boolean;
  error?: string;
}
