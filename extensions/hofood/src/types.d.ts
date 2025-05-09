export interface FoodResult {
  days: Day[];
  supplements: Supplement[];
  priceCategories: string[];
}

export interface Day {
  date: Date;
  mealTypes: MealType[];
}

export interface MealType {
  name: string;
  meals: Meal[];
}

export interface Meal {
  name: string;
  supplements: string[];
  prices: number[];
  icons: Icon[];
}

export interface Icon {
  icon: string;
  name?: string;
}

export interface Supplement {
  id: string;
  value: string;
}
