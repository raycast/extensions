// utils/displayHelpers.ts
import { Icon, Color, List } from "@raycast/api";
import { IngredientResult } from "../models/IngredientResult";

interface IngredientDisplay {
  icon: { source: Icon; tintColor: Color.ColorLike };
  statusText: string;
  accessories: List.Item.Accessory[];
}

export function getIngredientDisplay(ingredient: IngredientResult): IngredientDisplay {
  if (ingredient.error) {
    return {
      icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
      statusText: "Error",
      accessories: [{ text: ingredient.error }],
    };
  }
  if (ingredient.surelyVegan) {
    return {
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      statusText: "Surely Vegan",
      accessories: [{ tag: { value: "Surely Vegan", color: Color.Green } }],
    };
  }
  if (ingredient.isVegan === true) {
    return {
      icon: { source: Icon.QuestionMarkCircle, tintColor: "#2E8B57" },
      statusText: "Likely Vegan",
      accessories: [{ tag: { value: "Likely Vegan", color: "#2E8B57" } }],
    };
  }
  if (ingredient.maybeVegan) {
    return {
      icon: { source: Icon.QuestionMark, tintColor: Color.Yellow },
      statusText: "Maybe Vegan",
      accessories: [{ tag: { value: "Maybe Vegan", color: Color.Yellow } }],
    };
  }
  if (ingredient.isVegan === false) {
    return {
      icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
      statusText: "Not Vegan",
      accessories: [{ tag: { value: "Not Vegan", color: Color.Red } }],
    };
  }
  return {
    icon: { source: Icon.QuestionMark, tintColor: Color.Yellow },
    statusText: "Unknown",
    accessories: [{ tag: { value: "Unknown", color: Color.Yellow } }],
  };
}
