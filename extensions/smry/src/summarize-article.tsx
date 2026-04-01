import { Action, ActionPanel, Detail, LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchArticle, fetchSummary, getSmryUrl, isValidUrl } from "./api";

interface Arguments {
  url: string;
}

export default function SummarizeArticle(props: LaunchProps<{ arguments: Arguments }>) {
  const url = props.arguments.url?.trim();
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

    if (!isValidUrl(url)) {
      setError("Invalid URL. Please provide a valid HTTP/HTTPS URL.");
      setIsLoading(false);
      return;
    }

    async function run() {
      try {
        showToast({ style: Toast.Style.Animated, title: "Extracting article..." });
        const article = await fetchArticle(url);
        setTitle(article.title);

        showToast({ style: Toast.Style.Animated, title: "Generating summary..." });
        const result = await fetchSummary(article.textContent, article.title);
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
            {url && isValidUrl(url) && (
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
