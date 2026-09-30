import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { FoodleRecipe } from "../utils/types";
import RecipeDetail from "../components/RecipeDetail";
import { getFavicon } from "@raycast/utils";

export default function RecipeItem({ recipe }: { recipe: FoodleRecipe }) {
  function accessories() {
    const accessories = [];
    if (recipe.time) {
      accessories.push({ text: recipe.time, icon: Icon.Clock });
    }

    return accessories;
  }

  return (
    <List.Item
      title={recipe.name}
      subtitle={recipe.source}
      icon={recipe.url != "" ? getFavicon(recipe.url) : Icon.Receipt}
      accessories={accessories()}
      actions={
        <ActionPanel title={recipe.name}>
          <ActionPanel.Section>
            <Action.Push icon={Icon.Paragraph} title="Preview" target={<RecipeDetail recipe={recipe} />} />
            <Action.OpenInBrowser url={recipe.url} />
            <Action.CopyToClipboard content={recipe.url} title="Copy Link" />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
