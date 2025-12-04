import { Icon, Color, List } from "@raycast/api";
import { IngredientResult } from "../models/IngredientResult";

interface IngredientDisplay {
  icon: { source: Icon; tintColor: Color.ColorLike };
  statusText: string;
  accessories?: List.Item.Accessory[];
}

export function getIngredientDisplay(ingredient: IngredientResult): IngredientDisplay {
  if (ingredient.error) {
    return {
      icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
      statusText: "Error",
    };
  }
  if (ingredient.surelyVegan) {
    return {
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      statusText: "Vegan",
      accessories: [{ tag: { value: "Vegan", color: Color.Green } }],
    };
  }
  if (ingredient.maybeNotVegan) {
    return {
      icon: { source: Icon.XMarkCircleHalfDash, tintColor: Color.Orange },
      statusText: "Maybe not vegan",
      accessories: [{ tag: { value: "Maybe not vegan", color: Color.Orange } }],
    };
  }
  if (ingredient.unknown) {
    return {
      icon: { source: Icon.QuestionMark, tintColor: Color.SecondaryText },
      statusText: "Unknown",
      accessories: [{ tag: { value: "Unknown", color: Color.SecondaryText } }],
    };
  }
  if (ingredient.isVegan === true) {
    return {
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      statusText: "Vegan",
      accessories: [{ tag: { value: "Vegan", color: Color.Green } }],
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
    icon: { source: Icon.QuestionMark, tintColor: Color.Orange },
    statusText: "Unknown",
    accessories: [{ tag: { value: "Unknown", color: Color.Orange } }],
  };
}
