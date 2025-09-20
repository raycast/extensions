// src/fastgpt-view.tsx
import { ActionPanel, Detail, Icon, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { searchWithFastGPT } from "./utils/kagiApi";
import open from "open";

interface FastGPTViewProps {
  query: string;
}

export default function FastGPTView(props: FastGPTViewProps) {
  const { token, apiKey }: ExtensionPreferences = getPreferenceValues();
  const [isLoading, setIsLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [references, setReferences] = useState<{ title: string; snippet: string; url: string }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchFastGPTAnswer() {
      try {
        setIsLoading(true);
        const result = await searchWithFastGPT(props.query, apiKey ? apiKey : "", controller.signal);

        if (result) {
          setAnswer(result.content || "");
          setReferences(result.references || []);
        }
      } catch (err) {
        console.error("Error fetching FastGPT answer:", err);
        setError(`Failed to get answer: ${err}`);
      } finally {
        setIsLoading(false);
      }
    }
    fetchFastGPTAnswer();

    return () => controller.abort();
  }, [props.query, apiKey]);

  const markdown = `
# ${props.query}

${answer}

${references.length > 0 ? "## References\n" : ""}
${references.map((ref, index) => `${index + 1}. [${ref.title}](${ref.url})\n   ${ref.snippet}`).join("\n\n")}
  `;

  return (
    <Detail
      isLoading={isLoading}
      markdown={error ? `# Error\n\n${error}` : markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="References" text="" />
          {references.map((ref, index) => (
            <Detail.Metadata.Link
              key={`link-${index}`}
              title={ref.url.split("/")[2] || "Link"}
              text={ref.title}
              target={ref.url}
            />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Item
            title="Search on Kagi"
            icon={{ source: Icon.MagnifyingGlass }}
            onAction={() => open(`https://kagi.com/search?token=${token}&q=${encodeURIComponent(props.query)}`)}
          />
          {references.map((ref, index) => (
            <ActionPanel.Item
              key={index}
              title={`Open Reference ${index + 1}`}
              icon={{ source: Icon.ArrowRight }}
              onAction={() => open(ref.url)}
            />
          ))}
        </ActionPanel>
      }
    />
  );
}
