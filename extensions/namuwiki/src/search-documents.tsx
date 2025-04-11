import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import * as cheerio from "cheerio";

async function parseFetchResponse(response: { text: () => Promise<string> }) {
  const text = await response.text();
  const $ = cheerio.load(text);
  const results: Array<{ name: string; url: string; description: string }> = [];

  $("section div").each((_, element) => {
    const titleElement = $(element).find("h4 a");
    const descriptionElement = $(element).find("div").last();

    if (titleElement.length > 0 && descriptionElement.length > 0) {
      results.push({
        name: titleElement.text().trim(),
        url: `https://namu.wiki${titleElement.attr("href") ?? ""}`,
        description: descriptionElement.text().trim(),
      });
    }
  });

  return results;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data = [], isLoading } = useFetch(
    `https://namu.wiki/Search?target=title_content&q=${encodeURIComponent(searchText)}&namespace=${encodeURIComponent("문서")}`,
    { parseResponse: parseFetchResponse },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search documents in namu.wiki..."
    >
      <List.Section title="Search Results" subtitle={data?.length + ""}>
        {data.map((item) => (
          <List.Item
            key={item.url}
            title={item.name}
            subtitle={item.description}
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
