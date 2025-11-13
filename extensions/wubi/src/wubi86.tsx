import { useState } from "react";
import { Grid } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Item {
  K: string;
  V: string[]; // Assuming V is an array of strings; adjust as necessary
}

interface Response {
  content: unknown;
  flag: number;
}

type ResultsState = { flag: -1; items: [] } | { flag: 0; items: string[] } | { flag: 1; items: Item[] };

function isStringArray(content: unknown): content is string[] {
  return Array.isArray(content) && content.every((item) => typeof item === "string");
}

function isItemArray(content: unknown): content is Item[] {
  return (
    Array.isArray(content) &&
    content.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "K" in item &&
        typeof (item as Item).K === "string" &&
        "V" in item &&
        Array.isArray((item as Item).V) &&
        (item as Item).V.every((value) => typeof value === "string"),
    )
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const emptyResults: ResultsState = { flag: -1, items: [] };
  const requestUrl = `https://kisstools.com/raycast/search_86?keyword=${encodeURIComponent(
    searchText,
  )}&app_id=HVun9CsH27`;

  const { data, isLoading } = useFetch<ResultsState>(requestUrl, {
    keepPreviousData: true,
    parseResponse: async (response) => {
      const json = (await response.json()) as Response;
      if (json.flag === 0 && isStringArray(json.content)) {
        return { flag: 0, items: json.content };
      }
      if (json.flag === 1 && isItemArray(json.content)) {
        return { flag: 1, items: json.content };
      }
      console.error("Invalid data format received from API");
      return emptyResults;
    },
    onError: (error) => {
      console.error("Error fetching items:", error);
    },
  });

  const results = data ?? emptyResults;

  return (
    <Grid
      columns={4}
      aspectRatio={"3/2"}
      fit={Grid.Fit.Contain}
      inset={Grid.Inset.Zero}
      filtering={false}
      onSearchTextChange={setSearchText}
      throttle={true}
      navigationTitle="Look up Wubi character roots."
      searchBarPlaceholder="Input the Pinyin of one Chinese character or word"
      isLoading={isLoading}
    >
      {results.flag === 0 && results.items.map((item) => <Grid.Item key={item} content={item} />)}
      {results.flag === 1 &&
        results.items.map((item) => {
          return (
            <Grid.Section key={item.K} title={item.K}>
              {item.V.map((code) => (
                <Grid.Item key={`${item.K}-${code}`} content={code} />
              ))}
            </Grid.Section>
          );
        })}
    </Grid>
  );
}
