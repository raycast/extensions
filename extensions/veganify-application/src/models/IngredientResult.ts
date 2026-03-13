export interface IngredientResult {
  name: string;
  isVegan: boolean | null;
  surelyVegan: boolean;
  notVegan: boolean;
  maybeNotVegan: boolean;
  unknown: boolean;
  error?: string;
}
