export const baseUrl = "https://foodle.recipes/";

export interface FoodleRecipe {
  name: string;
  url: string;
  source: string;
  time: string;
  imageUrl: string;
}

export interface ParsedRecipe {
  name: string;
  author: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  recipeYield: string;
  recipeCategory: string;
  description: string;
  image: string | null;
  ingredients: string[];
  instructions: LdHowToStep[] | string[];
}

export enum FoodleSearchtype {
  Title = "t",
  Ingredient = "i",
}

export interface LdHowToStep {
  "@type": string;
  name: string | null;
  text: string | null;
  url: string | null;
}

export interface LdPerson {
  "@type": string;
  name: string | null;
}

export interface LdImage {
  "@type": string;
  url: string | null;
}
