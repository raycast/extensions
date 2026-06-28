import { Form, ActionPanel, Action, showToast, Toast, Detail, getPreferenceValues, Keyboard, Icon } from "@raycast/api";
import { useState } from "react";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

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
    } catch {
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

  const { handleSubmit: handleFormSubmit, itemProps } = useForm<{ query: string }>({
    onSubmit: handleSubmit,
    validation: {
      query: FormValidation.Required,
    },
  });

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
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action title="New Search" onAction={() => setShowResults(false)} shortcut={Keyboard.Shortcut.Common.New} />
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
          <Action.SubmitForm icon={Icon.MagnifyingGlass} title="Search Memories" onSubmit={handleFormSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Search Query"
        placeholder="What would you like to search for?"
        autoFocus
        {...itemProps.query}
      />
    </Form>
  );
}
