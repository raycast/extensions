import { AI, Action, ActionPanel, Detail, LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchArticle, getSmryUrl, normalizeUrl } from "./api";

interface Arguments {
  url: string;
}

export default function SummarizeArticle(props: LaunchProps<{ arguments: Arguments }>) {
  const url = props.arguments.url ? normalizeUrl(props.arguments.url) : "";
  const [title, setTitle] = useState<string>("");
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setError("Please provide a URL");
      setIsLoading(false);
      return;
    }

    async function run() {
      try {
        showToast({ style: Toast.Style.Animated, title: "Extracting article..." });
        const article = await fetchArticle(url);
        setTitle(article.title);

        showToast({ style: Toast.Style.Animated, title: "Generating summary..." });
        const text = article.textContent.slice(0, 12000);
        const result = await AI.ask(
          `Summarize the following article in 3-5 concise bullet points. Focus on the key ideas and takeaways.\n\nTitle: ${article.title}\n\nArticle:\n${text}`,
          { creativity: 0.3 },
        );
        setSummary(result);
        setIsLoading(false);
        showToast({ style: Toast.Style.Success, title: "Summary ready" });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: "Failed", message });
      }
    }

    run();
  }, [url]);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            {url && (
              <Action.OpenInBrowser title="Open in SMRY" url={getSmryUrl(url)} />
            )}
          </ActionPanel>
        }
      />
    );
  }

  const markdown = summary
    ? `# ${title}\n\n## Summary\n\n${summary}`
    : "Generating summary...";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={title || "Summarizing..."}
      actions={
        summary ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Summary" content={summary} />
            <Action.OpenInBrowser title="Read Full Article in SMRY" url={getSmryUrl(url)} />
            <Action.OpenInBrowser title="Open Original" url={url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
