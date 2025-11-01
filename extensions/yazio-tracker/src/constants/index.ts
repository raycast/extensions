// Constants for mock data generation
export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export const SAMPLE_FOODS = [
  { name: "Banana", producer: "Fresh Fruit Co.", calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { name: "Greek Yogurt", producer: "Dairy Farm", calories: 130, protein: 15, carbs: 9, fat: 5 },
  { name: "Oatmeal", producer: "Healthy Grains", calories: 150, protein: 5, carbs: 27, fat: 3 },
  { name: "Chicken Breast", producer: "Premium Poultry", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Brown Rice", producer: "Whole Grains Inc", calories: 110, protein: 2.6, carbs: 23, fat: 0.9 },
  { name: "Salmon Fillet", producer: "Ocean Fresh", calories: 206, protein: 22, carbs: 0, fat: 12 },
  { name: "Avocado", producer: "Green Valley", calories: 160, protein: 2, carbs: 9, fat: 15 },
  { name: "Sweet Potato", producer: "Farm Fresh", calories: 112, protein: 2, carbs: 26, fat: 0.1 },
  { name: "Almonds", producer: "Nut Company", calories: 164, protein: 6, carbs: 6, fat: 14 },
  { name: "Spinach Salad", producer: "Green Leaf Farms", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
];

export const NUTRIENT_KEYS = {
  ENERGY: "energy.energy",
  PROTEIN: "nutrient.protein",
  CARBS: "nutrient.carb",
  FAT: "nutrient.fat",
} as const;

export const DEFAULT_GOALS = {
  CALORIES: 2200,
  PROTEIN: 120,
  CARBS: 275,
  FAT: 73,
} as const;
