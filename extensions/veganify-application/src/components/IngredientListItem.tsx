import { List, ActionPanel, Action } from "@raycast/api";
import { IngredientResult } from "../models/IngredientResult";
import { getIngredientDisplay } from "../utils/displayHelpers";

export function IngredientListItem({ ingredient }: { ingredient: IngredientResult }) {
  const { icon, statusText, accessories } = getIngredientDisplay(ingredient);

  return (
    <List.Item
      title={ingredient.name}
      icon={icon}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Ingredient Status"
            content={`${ingredient.name}: ${statusText}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
