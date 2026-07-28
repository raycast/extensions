import { Action, ActionPanel, Detail, LaunchProps, Toast } from "@raycast/api";
import { getClient } from "./lib/tabstack";
import { useAsyncCommand } from "./lib/useAsyncCommand";

export default function Command(props: LaunchProps<{ arguments: Arguments.Extract }>) {
  const { url } = props.arguments;

  const { markdown, isLoading } = useAsyncCommand(
    "Extracting…",
    [url],
    { title: "Extracting Markdown…", message: url },
    "Extraction failed",
    async ({ isCancelled, toast, setMarkdown }) => {
      const result = await getClient().extract.markdown({ url });
      if (isCancelled()) return;
      setMarkdown(result.content);
      toast.style = Toast.Style.Success;
      toast.title = "Extracted";
    },
  );

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
