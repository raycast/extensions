import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { yazio } from "./utils/yazio";
import { LogFoodForm } from "./components/LogFoodForm";
import { ErrorView } from "./components/ErrorView";
import { isDevelopment, mockProductSearchResults } from "./utils/mockData";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, error } = usePromise(
    async (query) => {
      if (!query) {
        return [];
      }

      if (isDevelopment()) {
        // Return filtered mock data in development mode
        return mockProductSearchResults.filter(
          (item) =>
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            (item.producer && item.producer.toLowerCase().includes(query.toLowerCase())),
        );
      }

      try {
        const results = await yazio.products.search({ query });
        return results;
      } catch (error) {
        if (error instanceof Error && error.message.includes("oauth/token")) {
          throw new Error("Please check your Yazio credentials in extension preferences");
        }
        throw error;
      }
    },
    [searchText],
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search for a food..." throttle>
      <ErrorView error={error} />
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
                  <Action.Push icon={Icon.Plus} title="Log This Food" target={<LogFoodForm product={item} />} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        !error && <List.EmptyView title="Type to search for food" />
      )}
    </List>
  );
}
