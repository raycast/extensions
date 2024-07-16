import { ActionPanel, Action, List } from "@raycast/api";
import { Category, Recipe } from "./utils/types";
import { useCachedPromise } from "@raycast/utils";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { getText, buildUrl } from "./utils/receipe-utils";

export default function Command() {
  const [text, setText] = useState<string>("");

  const { isLoading, data } = useCachedPromise(
    async (url: string) => {
      const response = await fetch(url);
      const categories = (await response.json()) as Category[];

      const uniqueIds = new Set<string>();

      const recipes: Recipe[] = categories
        .flatMap((category) =>
          category.ops.map((op) => ({
            id: op.replace(" ", "_"),
            category: category.name,
            title: op,
          })),
        )
        .filter((recipe) => {
          const isDuplicate = uniqueIds.has(recipe.id);
          uniqueIds.add(recipe.id);
          return !isDuplicate;
        });

      return recipes;
    },
    ["https://raw.githubusercontent.com/gchq/CyberChef/master/src/core/config/Categories.json"],
    {
      // to make sure the screen isn't flickering when the searchText changes
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    const runAsync = async () => {
      const text = await getText();
      setText(text || "");
    };

    runAsync();
  }, []);

  return (
    <List searchBarPlaceholder="Search CyberChef recipes..." isLoading={isLoading}>
      {(data || []).map((recipe, index) => (
        <List.Item
          key={`${index}:${recipe.id}`}
          title={recipe.title}
          subtitle={recipe.category}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={buildUrl(recipe.id, undefined, text)} title="Open Recipe in CyberChef" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
