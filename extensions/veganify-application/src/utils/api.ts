import fetch from "node-fetch";
import { showToast, Toast } from "@raycast/api";
import { IngredientResult } from "../models/IngredientResult";
import { IngredientsCheckResponse } from "../models/IngredientsCheckResponse";

const API_BASE_URL = "https://api.veganify.app/v0";

export async function checkIngredient(ingredient: string): Promise<IngredientResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/ingredients/${encodeURIComponent(ingredient)}?translate=true`);
    if (response.status === 429) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Rate limit exceeded",
        message: "Please try again in a minute.",
      });
      throw new Error("Rate limit exceeded");
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = (await response.json()) as IngredientsCheckResponse;
    return { name: ingredient, isVegan: data.data.vegan };
  } catch (error) {
    console.error(`Error checking ingredient ${ingredient}:`, error);
    return {
      name: ingredient,
      isVegan: null,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}
