import { Form, ActionPanel, Action, showToast, Toast, Detail, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";
import { showFailureToast } from "@raycast/utils";

const API_URL = "https://api.mem0.ai/v1/memories/search/";

interface SearchResult {
  id: string;
  memory: string;
  user_id: string;
  metadata: object;
  categories: object;
  immutable: boolean;
  created_at: string;
  updated_at: string;
}

interface SearchResponse {
  results: SearchResult[];
}

interface Preferences {
  mem0ApiKey: string;
  defaultUserId: string;
}

export default function Command() {
  const { mem0ApiKey, defaultUserId } = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<string>("");
  const [showResults, setShowResults] = useState(false);
  const [query, setQuery] = useState<string>("");

  async function handleSubmit(values: { query: string }) {
    setIsLoading(true);
    setQuery(values.query);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Token ${mem0ApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: values.query,
          user_id: defaultUserId,
          output_format: "v1.1",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as SearchResponse;
      const concatenatedMemories = data.results.map((result) => result.memory).join("\n\n");

      setSearchResults(concatenatedMemories);
      setShowResults(true);

      await showToast({
        style: Toast.Style.Success,
        title: "Search completed",
        message: `Found ${data.results.length} results`,
      });
    } catch (error) {
      showFailureToast("Search failed", {
        primaryAction: {
          title: "Retry",
          onAction: () => handleSubmit({ query }),
        },
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (showResults) {
    return (
      <Detail
        navigationTitle={`Search Results: ${query}`}
        markdown={`# Search Results for "${query}"\n\n${searchResults}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Results"
              content={searchResults}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="New Search"
              onAction={() => setShowResults(false)}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search Memories" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="query" title="Search Query" placeholder="What would you like to search for?" autoFocus />
    </Form>
  );
}
