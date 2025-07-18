import { List, Action, ActionPanel, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import fetch from "node-fetch";

// Define the shape of a single result from your RAG API
interface RagResult {
  chunk: string;
  distance: number;
  metadata: {
    filename?: string;
    [key: string]: any; // Allows for other metadata properties
  };
}

// Define the shape of the full API response
interface ApiResponse {
  results: RagResult[];
}

export default function Command() {
  const ragBrainUrl = "https://rag.petermsimon.com/query";

  // usePromise handles isLoading, data, and errors for us automatically.
  // It re-runs the fetch function whenever its dependency (the search text) changes.
  const { isLoading, data, revalidate } = usePromise(
    async (searchText: string) => {
      if (!searchText.trim()) {
        return [] as RagResult[]; // Return an empty array if search is empty
      }

      const response = await fetch(ragBrainUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchText }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const json = (await response.json()) as ApiResponse;
      return json.results || [];
    },
    [] // Initial empty array for dependencies
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={revalidate} // This re-runs the promise with the new text
      searchBarPlaceholder="Search your knowledge base..."
      throttle // This makes the UI feel smoother while typing
    >
      <List.EmptyView title="No results" description="Type to search your knowledge base." />
      {data?.map((res, idx) => (
        <List.Item
          key={idx}
          title={res.metadata.filename || `Chunk from document`}
          subtitle={res.chunk.slice(0, 70) + "..."}
          accessories={[{ text: `Distance: ${res.distance.toFixed(3)}` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Full Chunk"
                target={
                  <Detail
                    markdown={`## Chunk\n\n---\n\n${res.chunk}\n\n---\n\n**Source:** \`${
                      res.metadata.filename || "N/A"
                    }\``}
                  />
                }
              />
              <Action.CopyToClipboard title="Copy Chunk" content={res.chunk} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
