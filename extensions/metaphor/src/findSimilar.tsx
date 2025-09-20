import { useEffect, useState, useRef } from "react";
import { Action, ActionPanel, List, Image, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import Metaphor from "metaphor-node";
import { Result } from "./type";

const apikey = getPreferenceValues<ExtensionPreferences>().MetaphorAPIKey;
const metaphor = new Metaphor(apikey);

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      searchArticles();
    }, 800);

    const searchArticles = async () => {
      try {
        const response = await metaphor.findSimilar(searchText, {
          numResults: 10,
        });
        setResults(response.results);
      } catch (error) {
        const err = error as Error;
        if (!err.message.includes("400")) {
          console.log(err.message);
          showToast({
            style: Toast.Style.Failure,
            title: "Something went wrong hhh",
            message: err.message,
          });
        }
      }
      setLoading(false);
    };
  }, [searchText]);

  return (
    <List
      isLoading={loading}
      searchText={searchText}
      navigationTitle="Search Similar Links"
      onSearchTextChange={setSearchText}
    >
      {results.length > 0 &&
        results.map((result) => (
          <List.Item
            key={result.id}
            icon={getFavicon(result.url, { mask: Image.Mask.RoundedRectangle })}
            title={result.title ? result.title : "Empty Title"}
            subtitle={result.author}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open In Browser" url={result.url} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
