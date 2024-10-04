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
  if (ingredient.isVegan === true) {
    return {
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      statusText: "Likely Vegan",
      accessories: [{ tag: { value: "Likely Vegan", color: Color.Green } }],
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
