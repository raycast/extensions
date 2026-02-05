import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

interface Props {
  title: string;
  text: string;
  generator: (text: string) => Promise<string>;
  loadingMessage: string;
}

export function AIResultView({ title, text, generator, loadingMessage }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function generate() {
      try {
        const content = await generator(text);
        setResult(content);
        setIsLoading(false);
      } catch (err) {
        setError("Failed to generate result");
        setIsLoading(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Generation failed",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    generate();
  }, [text, generator]);

  if (isLoading) {
    return <Detail isLoading={true} markdown={`# ${loadingMessage}...\n\nPlease wait`} />;
  }

  if (error || !result) {
    return (
      <Detail
        markdown={`# Error\n\n${error || "Failed to generate result"}`}
        actions={
          <ActionPanel>
            <Action title="Close" onAction={() => {}} shortcut={{ modifiers: ["cmd"], key: "w" }} />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = `# ${title}\n\n${result}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            content={result}
            title="Copy Result"
            onCopy={async () => {
              await showToast({
                style: Toast.Style.Success,
                title: "Copied to clipboard",
              });
            }}
          />
          <Action.CopyToClipboard content={markdown} title="Copy as Markdown" />
          <Action.Paste content={result} title="Paste to Active App" />
        </ActionPanel>
      }
    />
  );
}
