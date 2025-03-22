import { ActionPanel, List, Action, showToast, Toast, Image, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import ProfileView from "./profile";
import Service, { SearchResultEntry } from "./service";

const service = new Service();

export default function Command() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultEntry[]>([]);
  const [isLoading, setLoading] = useState(true);

  const search = async () => {
    setLoading(true);

    return await service
      .search(query)
      .then((res) => {
        setResults(res.results);
      })
      .catch((err) => {
        showToast(Toast.Style.Failure, "Error searching profiles", err.message);
        setResults([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    (async () => {
      if (query === "") {
        await service.getLatestSearches().then((res) => {
          setResults(res);
          setLoading(false);
        });
        return;
      }
      if (query.length < 3 || query.length > 21) {
        return;
      }
      await search();
    })();
  }, [query]);

  return (
    <List
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="Search for a username..."
      onSearchTextChange={async (query) => setQuery(query.trim())}
    >
      <List.Section title={query === "" ? "Latest Searches" : "Results"}>
        {results.map((entry) => {
          return (
            <List.Item
              key={entry.uuid}
              title={entry.userName}
              subtitle={entry.uuid}
              accessories={[
                {
                  icon: {
                    source: "https://laby.net/texture/profile/head/" + entry.uuid + ".png?size=32",
                    mask: Image.Mask.RoundedRectangle,
                    fallback: "command-icon.png",
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="Show Profile" target={<ProfileView uuid={entry.uuid} />} icon={Icon.Person} />
                  <Action.CopyToClipboard
                    title="Copy UUID"
                    content={entry.uuid}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Remove from Search History"
                    onAction={async () => {
                      await service.removeSearch(entry.uuid);
                      await service.getLatestSearches().then((res) => {
                        setResults(res);
                      });
                    }}
                    icon={Icon.Trash}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
