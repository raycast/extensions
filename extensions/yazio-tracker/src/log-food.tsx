import { Action, ActionPanel, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { yazio } from "./utils/yazio";
import { LogFoodForm } from "./components/LogFoodForm";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, error } = usePromise(
    async (query) => {
      if (!query) {
        return [];
      }
      const results = await yazio.products.search({ query });
      return results;
    },
    [searchText],
  );

  if (error) {
    return (
      <List>
        <List.EmptyView title="Error" description={error.message} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search for a food..." throttle>
      {data && data.length > 0 ? (
        <List.Section title="Search Results">
          {data.map((item) => (
            <List.Item
              key={item.product_id}
              title={item.name}
              subtitle={item.producer}
              accessories={[
                {
                  text: `${Math.round(item.nutrients["energy.energy"] * item.amount)} kcal`,
                },
                { text: `${item.amount}g` },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="Log This Food" target={<LogFoodForm product={item} />} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="Type to search for food" />
      )}
    </List>
  );
}
