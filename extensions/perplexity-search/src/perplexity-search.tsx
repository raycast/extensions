import { Action, ActionPanel, List, open } from "@raycast/api";
import { searchCompletion } from "./complete";

export default function Command() {
  const { search, results } = searchCompletion();

  return (
    <List onSearchTextChange={search} searchBarPlaceholder="Search Perplexity">
      <List.Section title="Queries" subtitle={`Results: ${results.length}`}>
        {results.map((result) => (
          <List.Item 
            key={result} 
            title={result} 
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Result">
                  <Action
                    title="Open in Perplexity"
                    onAction={async () => {
                      const params = new URLSearchParams({
                        q: result,
                        copilot: "true",
                        focus: "all",
                      });
                      open(`https://www.perplexity.ai/search?${params}`);
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            } 
          />
        ))}
      </List.Section>
    </List>
  );
}
