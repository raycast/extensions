import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as string[];

  return json.map((result) => ({
    rank: json.findIndex((x) => x === result) + 1,
    document: result,
    url: `https://namu.wiki/w/${encodeURIComponent(result)}`,
  })) as SearchResult[];
}

export default function Command() {
  const { data = [], isLoading } = useFetch("https://search.namu.wiki/api/ranking", {
    parseResponse: parseFetchResponse,
  });

  return (
    <List isLoading={isLoading}>
      <List.Section title="Current Trending Documents" subtitle={new Date().toLocaleString()}>
        {data.map((item) => (
          <List.Item
            key={item.document}
            title={item.document}
            accessories={[{ text: item.rank.toString() }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

interface SearchResult {
  rank: number;
  document: string;
  url: string;
}
