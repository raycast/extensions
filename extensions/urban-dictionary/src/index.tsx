import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";
import { useState, useEffect } from "react";

interface Term {
  definition: string;
  permalink: string;
  word: string;
  author: string;
  thumbs_up: number;
  thumbs_down: number;
  defid: number;
}

export default function UrbanDictionarySearch() {
  const [query, setQuery] = useState<string>("");
  const [terms, setTerms] = useState<Term[]>([]);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function fetchTerms() {
      try {
        if (query) {
          setIsLoading(true);
          let res: Term[] = [];
          res = await searchUrbanDictionary(query);
          setTerms(res);
          setIsLoading(false);
        }
      } catch (err) {
        let errorMessage = "Something went wrong";
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        setError(errorMessage);
      }
    }

    fetchTerms();
  }, [query]);

  if (error) {
    showToast({
      title: "An error occured",
      message: error,
      style: Toast.Style.Failure,
    });
  }

  return (
    <List
      onSearchTextChange={(text) => setQuery(text)}
      throttle
      searchBarPlaceholder="Enter term to search..."
      isLoading={isLoading}
    >
      {terms
        ? terms.map((item, idx) => {
            return (
              <List.Item
                title={item.definition}
                subtitle={item.author}
                accessoryTitle={`👍  ${item.thumbs_up} 👎 ${item.thumbs_down}`}
                actions={
                  <ActionPanel title={item.definition}>
                    {item.permalink && <Action.OpenInBrowser url={item.permalink} />}
                    <Action.CopyToClipboard content={item.definition} />
                  </ActionPanel>
                }
                key={idx}
              />
            );
          })
        : null}
    </List>
  );
}

const searchUrbanDictionary = async (term?: string): Promise<Term[]> => {
  const options: AxiosRequestConfig = {
    method: "GET",
    url: `https://api.urbandictionary.com/v0/define?term=${term}`,
  };

  const results = await axios.request(options);
  return processResults(results.data.list);
};

const processResults = (results: []): Term[] => {
  return results.map((result: Term) => {
    return {
      permalink: result.permalink || "",
      word: result.word || "",
      author: result.author || "",
      thumbs_up: result.thumbs_up || 0,
      thumbs_down: result.thumbs_down || 0,
      defid: result.defid,
      definition: result.definition ? result.definition.replaceAll("[", "").replaceAll("]", "") : "",
    };
  });
};
