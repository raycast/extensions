import { Detail, ActionPanel, Action, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useCallback, useEffect } from "react";

const API_URL = "https://api.nope.rs";

type NopeResponse = {
  response: string;
  status: string;
  message: string;
  data: {
    nope: string;
  };
};
export default function Command() {
  const [nope, setNope] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNope = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = (await response.json()) as NopeResponse;
      if (result.data.nope) {
        setNope(result.data.nope);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Error fetching nope:", error);
      showFailureToast(error, { title: "Something went wrong" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNope();
  }, [fetchNope]);

  const getMarkdown = () => {
    if (error) {
      return `# ❌ Error\n\n${error}\n\nTry again or check your internet connection.`;
    }
    return "# " + (nope ? nope : "Loading...");
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={getMarkdown()}
      actions={
        <ActionPanel>
          <Action title="Get Another Nope" onAction={fetchNope} />
          <Action title="Copy Nope" onAction={() => Clipboard.copy(nope ?? "")} />
        </ActionPanel>
      }
    />
  );
}
