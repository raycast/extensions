import { Action, ActionPanel, Detail, Icon, Keyboard, Toast, showInFinder, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { errorMessage, getClient, showError, writeToDownloads } from "../lib/raycast";

function fileNameFor(url: string): string {
  let host = "page";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").replace(/[^a-z0-9.-]/gi, "-");
  } catch {
    // Keep the generic name.
  }
  return `snaprender-${host}.md`;
}

export default function MarkdownResult({ url, nested }: { url: string; nested?: boolean }) {
  const { data, isLoading, error, revalidate } = usePromise(
    (target: string) => getClient().extractMarkdown(target),
    [url],
    {
      onError: (err) => showError("Could not read page", err),
    },
  );

  const content = data?.content ?? "";
  let markdown: string;
  if (isLoading) markdown = `Reading **${url}** ...`;
  else if (error) markdown = `## Could not read page\n\n${errorMessage(error)}`;
  else if (data && !content.trim())
    markdown = "## No readable text found\n\nThe page loaded but had no main text to extract.";
  else markdown = content;

  const save = async () => {
    try {
      const target = await writeToDownloads(fileNameFor(data?.url ?? url), Buffer.from(content, "utf8"));
      await showToast({
        style: Toast.Style.Success,
        title: "Saved to Downloads",
        message: target.split("/").pop(),
        primaryAction: { title: "Show in Finder", onAction: () => showInFinder(target) },
      });
    } catch (err) {
      await showError("Could not save file", err);
    }
  };

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={nested ? "Page as Markdown" : undefined}
      markdown={markdown}
      actions={
        <ActionPanel>
          {data && content ? (
            <>
              <ActionPanel.Section>
                <Action.CopyToClipboard title="Copy Markdown" content={content} />
                <Action.Paste title="Paste Markdown" content={content} />
                <Action
                  title="Save to Downloads"
                  icon={Icon.Download}
                  shortcut={Keyboard.Shortcut.Common.Save}
                  onAction={save}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Page URL"
                  content={data.url ?? url}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.OpenInBrowser title="Open Page in Browser" url={data.url ?? url} />
                <Action
                  title="Read Again"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel.Section>
            </>
          ) : (
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
          )}
        </ActionPanel>
      }
    />
  );
}
