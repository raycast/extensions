import { Action, ActionPanel, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";

interface BaseItem {
  name: string;
  value: number;
}

interface ExtendedItem extends BaseItem {
  id: string;
}

type JBVResponse = {
  [key: string]: BaseItem;
};

const JBV_BASE_URL = "https://jbvalues.com";

function getCategoryFromItemId(itemId: string) {
  const map = {
    v: "Vehicle",
    c: "Color",
    r: "Rim",
    t: "Texture",
    s: "Spoiler",
    hyper: "Hyper",
  };

  for (const [shortCategory, longCategory] of Object.entries(map)) {
    if (itemId.includes(shortCategory)) return longCategory;
  }

  return null;
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExtendedItem[]>([]);
  const [filteredResults, setFilteredResults] = useState<ExtendedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchResults = async () => {
    try {
      setIsLoading(true);

      const res = await fetch(`${JBV_BASE_URL}/api/items`);
      const data = (await res.json()) as JBVResponse;

      const mappedData = Object.entries(data).map(([id, data]) => ({
        id,
        name: data.name,
        value: data.value,
      }));

      setResults(mappedData);

      return mappedData;
    } catch (error) {
      console.error(error);
      showFailureToast({ title: "Error fetching results" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults().then((data) => setFilteredResults(data!));
  }, []);

  useEffect(() => {
    if (results.length > 0) {
      const filtered = results.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
      setFilteredResults(filtered);
    }
  }, [query]);

  return (
    <List isLoading={isLoading} searchText={query} onSearchTextChange={setQuery} throttle>
      {filteredResults.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          accessories={[{ text: `$ ${item.value.toLocaleString()}` }]}
          subtitle={getCategoryFromItemId(item.id)!}
          icon={`${JBV_BASE_URL}/images/itemimages/${item.id}.webp`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${JBV_BASE_URL}/item/${item.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
