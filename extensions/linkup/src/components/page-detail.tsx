import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { fetchMarkdown, formatLinkupError, getHostname } from "../linkup";

type PageDetailProps = {
  url: string;
};

export function PageDetail({ url }: PageDetailProps) {
  const { data, error, isLoading, revalidate } = usePromise(fetchMarkdown, [url], {
    onError: (error) => {
      showFailureToast(new Error(formatLinkupError(error)), { title: "Failed to fetch page" });
    },
  });

  const markdown = error
    ? `# Failed to Fetch Page\n\n${formatLinkupError(error)}`
    : (data?.markdown ?? (isLoading ? "" : "_No content returned._"));

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={getHostname(url)}
      markdown={markdown}
      actions={
        <ActionPanel>
          {data?.markdown ? <Action.CopyToClipboard title="Copy Markdown" content={data.markdown} /> : null}
          <Action.OpenInBrowser url={url} />
          <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action title="Retry" icon={Icon.RotateClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}
