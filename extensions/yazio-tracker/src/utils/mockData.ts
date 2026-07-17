// Mock data for development mode to create store images
import { getPreferenceValues } from "@raycast/api";

export const mockDailySummary = {
  steps: 8500,
  activity_energy: 380,
  consume_activity_energy: true,
  water_intake: 1800,
  goals: {
    "energy.energy": 2200,
    "nutrient.carb": 275,
    "nutrient.fat": 73,
    "nutrient.protein": 120,
    "activity.step": 10000,
    "bodyvalue.weight": 70,
    water: 2000,
  },
  units: {
    energy: "kcal",
    weight: "kg",
    volume: "ml",
  },
  meals: {
    breakfast: {
      nutrients: {
        "energy.energy": 485,
        "nutrient.protein": 28,
        "nutrient.carb": 52,
        "nutrient.fat": 18,
      },
    },
    lunch: {
      nutrients: {
        "energy.energy": 620,
        "nutrient.protein": 38,
        "nutrient.carb": 58,
        "nutrient.fat": 24,
      },
    },
    dinner: {
      nutrients: {
        "energy.energy": 720,
        "nutrient.protein": 45,
        "nutrient.carb": 68,
        "nutrient.fat": 30,
      },
    },
    snack: {
      nutrients: {
        "energy.energy": 220,
        "nutrient.protein": 12,
        "nutrient.carb": 28,
        "nutrient.fat": 8,
      },
    },
  },
  activities: {
    nutrients: {
      "energy.energy": -380,
    },
  },
  user: null,
  active_fasting_countdown_template_key: null,
};

export const mockGoals = {
  "energy.energy": 2200, // Slightly higher goal to show good progress
  "nutrient.protein": 120,
  "nutrient.carb": 275,
  "nutrient.fat": 73,
  "activity.step": 10000,
  "bodyvalue.weight": 70,
  water: 2000,
};

export const mockUser = {
  diet: {
    name: "balanced",
    protein_percentage: 20,
    carb_percentage: 50,
    fat_percentage: 30,
  },
};

export const mockConsumedItems = {
  products: [
    {
      id: "consumed-1",
      product_id: "oatmeal-123",
      daytime: "breakfast" as const,
      amount: 50,
    },
    {
      id: "consumed-2",
      product_id: "banana-456",
      daytime: "breakfast" as const,
      amount: 120,
    },
    {
      id: "consumed-3",
      product_id: "chicken-789",
      daytime: "lunch" as const,
      amount: 150,
    },
    {
      id: "consumed-4",
      product_id: "rice-012",
      daytime: "lunch" as const,
      amount: 80,
    },
    {
      id: "consumed-5",
      product_id: "broccoli-345",
      daytime: "lunch" as const,
      amount: 100,
    },
    {
      id: "consumed-6",
      product_id: "salmon-678",
      daytime: "dinner" as const,
      amount: 180,
    },
    {
      id: "consumed-7",
      product_id: "quinoa-901",
      daytime: "dinner" as const,
      amount: 75,
    },
    {
      id: "consumed-8",
      product_id: "asparagus-234",
      daytime: "dinner" as const,
      amount: 120,
    },
    {
      id: "consumed-9",
      product_id: "almonds-567",
      daytime: "snack" as const,
      amount: 30,
    },
  ],
  recipe_portions: [
    {
      id: "recipe-1",
      recipe_id: "smoothie-bowl-890",
      daytime: "breakfast" as const,
      portion_count: 1,
      name: "Berry Protein Smoothie Bowl",
      calories: 285,
    },
    {
      id: "recipe-2",
      recipe_id: "stir-fry-123",
      daytime: "dinner" as const,
      portion_count: 1,
      name: "Vegetable Stir-Fry",
      calories: 340,
    },
  ],
};

export const mockProducts = {
  "oatmeal-123": {
    id: "oatmeal-123",
    name: "Steel Cut Oats",
    producer: "Quaker",
    nutrients: {
      "energy.energy": 3.79, // per gram
    },
  },
  "banana-456": {
    id: "banana-456",
    name: "Fresh Banana",
    producer: "Organic Farms",
    nutrients: {
      "energy.energy": 0.89,
    },
  },
  "chicken-789": {
    id: "chicken-789",
    name: "Grilled Chicken Breast",
    producer: "Farm Fresh",
    nutrients: {
      "energy.energy": 1.65,
    },
  },
  "rice-012": {
    id: "rice-012",
    name: "Brown Rice (cooked)",
    producer: "Uncle Ben's",
    nutrients: {
      "energy.energy": 1.12,
    },
  },
  "broccoli-345": {
    id: "broccoli-345",
    name: "Fresh Broccoli",
    producer: "Green Valley",
    nutrients: {
      "energy.energy": 0.34,
    },
  },
  "salmon-678": {
    id: "salmon-678",
    name: "Atlantic Salmon Fillet",
    producer: "Ocean Fresh",
    nutrients: {
      "energy.energy": 2.08,
    },
  },
  "quinoa-901": {
    id: "quinoa-901",
    name: "Cooked Quinoa",
    producer: "Ancient Grains",
    nutrients: {
      "energy.energy": 1.2,
    },
  },
  "asparagus-234": {
    id: "asparagus-234",
    name: "Fresh Asparagus",
    producer: "Garden Fresh",
    nutrients: {
      "energy.energy": 0.2,
    },
  },
  "almonds-567": {
    id: "almonds-567",
    name: "Raw Almonds",
    producer: "Blue Diamond",
    nutrients: {
      "energy.energy": 5.79,
    },
  },
};

export const mockProductSearchResults = [
  {
    product_id: "apple-fresh-001",
    name: "Fresh Red Apple",
    producer: "Organic Valley",
    amount: 100,
    serving: null,
    serving_quantity: null,
    nutrients: {
      "energy.energy": 0.52,
    },
  },
  {
    product_id: "greek-yogurt-002",
    name: "Greek Yogurt Plain",
    producer: "Chobani",
    amount: 170,
    serving: null,
    serving_quantity: null,
    nutrients: {
      "energy.energy": 0.59,
    },
  },
  {
    product_id: "whole-wheat-bread-003",
    name: "Whole Wheat Bread",
    producer: "Dave's Killer Bread",
    amount: 28,
    serving: null,
    serving_quantity: null,
    nutrients: {
      "energy.energy": 2.65,
    },
  },
  {
    product_id: "avocado-004",
    name: "Fresh Avocado",
    producer: "California Avocados",
    amount: 150,
    serving: null,
    serving_quantity: null,
    nutrients: {
      "energy.energy": 1.6,
    },
  },
  {
    product_id: "eggs-005",
    name: "Large Eggs",
    producer: "Happy Farms",
    amount: 50,
    serving: null,
    serving_quantity: null,
    nutrients: {
      "energy.energy": 1.55,
    },
  },
  {
    product_id: "spinach-006",
    name: "Fresh Baby Spinach",
    producer: "Earthbound Farm",
    amount: 85,
    serving: null,
    serving_quantity: null,
    nutrients: {
      "energy.energy": 0.23,
    },
  },
  {
    product_id: "sweet-potato-007",
    name: "Roasted Sweet Potato",
    producer: "Organic Roots",
    amount: 200,
    serving: null,
    serving_quantity: null,
    nutrients: {
      "energy.energy": 0.9,
    },
  },
  {
    product_id: "blueberries-008",
    name: "Fresh Blueberries",
    producer: "Driscoll's",
    amount: 125,
    serving: null,
    serving_quantity: null,
    nutrients: {
      "energy.energy": 0.57,
    },
  },
];

// Cache the development state to prevent flickering
let cachedIsDevelopment: boolean | null = null;

export const isDevelopment = () => {
  if (cachedIsDevelopment === null) {
    const preferences = getPreferenceValues<Preferences>();
    cachedIsDevelopment = preferences.useMockData;
  }
  return cachedIsDevelopment;
};
