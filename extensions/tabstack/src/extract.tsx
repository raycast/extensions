import { Action, ActionPanel, Detail, LaunchProps, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { friendlyError, getClient } from "./lib/tabstack";

export default function Command(props: LaunchProps<{ arguments: Arguments.Extract }>) {
  const { url } = props.arguments;
  const [markdown, setMarkdown] = useState("Extracting…");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Extracting Markdown…", message: url });
      try {
        const result = await getClient().extract.markdown({ url });
        if (cancelled) return;
        setMarkdown(result.content);
        toast.style = Toast.Style.Success;
        toast.title = "Extracted";
      } catch (error) {
        if (cancelled) return;
        const message = friendlyError(error);
        setMarkdown(`## Extraction failed\n\n${message}`);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = message;
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={url}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Markdown" content={markdown} />
          <Action.OpenInBrowser url={url} />
        </ActionPanel>
      }
    />
  );
}
