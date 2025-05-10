import { Image } from "@raycast/api";

export const baseUrl = "https://foodle.recipes/";

export interface FoodleRecipe {
  name: string;
  url: string;
  source: string;
  time: string;
  imageUrl: string;
}

export interface JsonLdRecipe {
  name: string;
  author: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  recipeYield: string;
  recipeCategory: string;
  description: string;
  image: Image;
  ingredients: string[] | string;
  instructions: string[];
}

export enum FoodleSearchtype {
  Title = "t",
  Ingredient = "i",
}
