import fetch from "node-fetch";
import { showToast, Toast } from "@raycast/api";
import { IngredientResult } from "../models/IngredientResult";
import { IngredientsCheckResponse } from "../models/IngredientsCheckResponse";

const API_BASE_URL = "https://api.veganify.app/v1";

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
      let errorMessage = `HTTP error! status: ${response.status}`;
      if (response.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Error checking ingredient",
        message: errorMessage,
      });

      throw new Error(errorMessage);
    }

    const data = (await response.json()) as IngredientsCheckResponse;
    return {
      name: ingredient,
      isVegan: data.data.vegan,
      surelyVegan: data.data.surely_vegan.includes(ingredient.toLowerCase()),
      maybeNotVegan: data.data.maybe_not_vegan.includes(ingredient.toLowerCase()),
      notVegan: data.data.not_vegan.includes(ingredient.toLowerCase()),
      unknown: data.data.unknown.includes(ingredient.toLowerCase()),
    };
  } catch (error) {
    console.error(`Error checking ingredient ${ingredient}:`, error);

    if (error instanceof TypeError && error.message.includes("fetch failed")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Server unreachable",
        message: "The server is currently unavailable. Please try again later.",
      });
    } else if (!(error instanceof Error) || !error.message.includes("Rate limit exceeded")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error checking ingredient",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }

    return {
      name: ingredient,
      isVegan: null,
      surelyVegan: false,
      maybeNotVegan: false,
      notVegan: false,
      unknown: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}
