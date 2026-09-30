import fetch from "node-fetch";
import { useState, useEffect, useRef } from "react";
import { Form, ActionPanel, Action, useNavigation, Detail, Clipboard } from "@raycast/api";
import { BASE_URL } from "./scira";

// Define Message type to match what the API expects
type Message = {
  role: "user";
  parts: {
    type: "text";
    text: string;
  }[];
};

// Form values interface
interface FormValues {
  query: string;
  group: string;
}

// This function handles the API call with a normal POST request
async function searchScira(query: string, group?: string): Promise<string> {
  // Make sure query is defined
  if (!query) {
    console.error("Missing required parameter: query");
    throw new Error("Missing required parameter: query must be provided");
  }

  // Define the request body type with optional group
  type RequestBody = {
    messages: Message[];
    model: string;
    group?: string;
  };

  const body: RequestBody = {
    messages: [
      {
        role: "user",
        parts: [
          {
            type: "text",
            text: query,
          },
        ],
      },
    ],
    model: "scira-default",
  };

  // Only add group parameter if it's specified
  if (group) {
    body.group = group;
  }

  console.log("Sending request with:", body);

  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const statusCode = response.status;

      if (statusCode === 404) {
        throw new Error("Server not found. Please check if the Scira service is running.");
      } else if (statusCode === 500) {
        throw new Error("Server error occurred. Please try again later.");
      } else if (statusCode === 429) {
        throw new Error("Too many requests. Please wait a moment and try again.");
      } else {
        throw new Error(`Error: ${statusCode} - ${response.statusText}`);
      }
    }

    const result = await response.text();
    return result;
  } catch (error) {
    console.error("Error fetching from Scira:", error);
    throw error;
  }
}

// Component for showing search results
function SearchResults({ query, group }: { query: string; group: string }) {
  const { push } = useNavigation();
  const [result, setResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const searchPerformed = useRef<boolean>(false);

  // UseEffect with a strict condition to run exactly once
  useEffect(() => {
    // Use a ref to ensure we only execute this once per component instance
    if (!searchPerformed.current) {
      searchPerformed.current = true;
      console.log("Making API call once with query:", query, "and group:", group);

      searchScira(query, group)
        .then((searchResult) => {
          setResult(searchResult);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Error searching Scira:", err);
          setError(err instanceof Error ? err.message : "An unknown error occurred");
          setIsLoading(false);
        });
    }
  }, []); // Empty dependency array means this runs once on mount

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);

    searchScira(query, group)
      .then((searchResult) => {
        setResult(searchResult);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error searching Scira:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        setIsLoading(false);
      });
  };

  const handleNewSearch = () => {
    push(<Command defaultQuery={query} defaultGroup={group} />);
  };

  const handleCopyToClipboard = () => {
    if (result) {
      Clipboard.copy(result);
    }
  };

  if (error) {
    return (
      <Detail
        markdown={`# Error Occurred\n\n${error}\n\nPlease try again or check your network connection.`}
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={handleRefresh} shortcut={{ modifiers: ["cmd"], key: "r" }} />
            <Action title="New Search" onAction={handleNewSearch} shortcut={{ modifiers: ["cmd"], key: "n" }} />
          </ActionPanel>
        }
      />
    );
  }

  const loadingMarkdown = `# Loading...\n\n### Fetching results from Scira\n\nPlease wait while we process your query: "${query}"`;
  const resultsMarkdown = `## ${query}\n\n${result}`;

  return (
    <Detail
      markdown={isLoading ? loadingMarkdown : resultsMarkdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={handleRefresh} shortcut={{ modifiers: ["cmd"], key: "r" }} />
          <Action title="New Search" onAction={handleNewSearch} shortcut={{ modifiers: ["cmd"], key: "n" }} />
          <Action title="Copy Results" onAction={handleCopyToClipboard} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    />
  );
}

// Main command component with form
export default function Command(props: { defaultQuery?: string; defaultGroup?: string } = {}) {
  const { push } = useNavigation();

  // Get default values from props
  const defaultQuery = props.defaultQuery || "";
  const defaultGroup = props.defaultGroup || "web"; // Default to web if not specified

  // State for form values
  const [query, setQuery] = useState(defaultQuery);
  const [group, setGroup] = useState(defaultGroup);

  // Handle form submission
  function handleSubmit(values: FormValues) {
    console.log("Form submitted with values:", values);
    // Add a unique key to force a new component instance when navigating
    push(<SearchResults key={`search-${Date.now()}`} query={values.query} group={values.group} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Ask Scira anything and get truthful answers." />
      <Form.TextField
        id="query"
        title="Search Query"
        placeholder="What would you like to know?"
        value={query}
        onChange={setQuery}
        autoFocus
      />
      <Form.Dropdown id="group" title="Source Filter" value={group} onChange={setGroup}>
        <Form.Dropdown.Item value="web" title="Web" />
        <Form.Dropdown.Item value="x" title="X (Twitter)" />
      </Form.Dropdown>
    </Form>
  );
}
