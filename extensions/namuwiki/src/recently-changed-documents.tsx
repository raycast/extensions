import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as {
    document: string;
    date?: number;
  }[];

  if (!Array.isArray(json)) {
    throw new Error("Unexpected API response structure");
  }

  return json.map((result) => ({
    document: result.document,
    date: result.date ? new Date(result.date * 1000).toLocaleTimeString() : "N/A", // UNIX timestamp conversion
    url: `https://namu.wiki/w/${encodeURIComponent(result.document)}`,
  })) as SearchResult[];
}

export default function Command() {
  const { data, isLoading } = useFetch("https://namu.wiki/sidebar.json", { parseResponse: parseFetchResponse });

  return (
    <List isLoading={isLoading}>
      <List.Section title="Recently Changed Documents" subtitle={"on " + new Date().toLocaleDateString()}>
        {data &&
          data.map((item) => (
            <List.Item
              key={item.document}
              title={item.document}
              accessories={[{ text: item.date }]}
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
  document: string;
  date: string;
  url: string;
}
