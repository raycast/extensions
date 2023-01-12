import { Action, ActionPanel, Detail } from "@raycast/api";
import { PageSummary } from "./wikipedia";

function ShowDetailsPage({ page }: { page: PageSummary }) {
  const markdown = `
  
  # ${page.title}
  
  ###### ${page.description ? page.description : ""}

  ---

  ${page.extract} [read more](${page.content_urls.desktop.page})

  `;

  return (
    <Detail
      navigationTitle={page.title}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={page.content_urls.desktop.page} />
          <Action.CopyToClipboard
            shortcut={{ modifiers: ["cmd"], key: "." }}
            title="Copy URL"
            content={page.content_urls.desktop.page}
          />
        </ActionPanel>
      }
    />
  );
}

export default ShowDetailsPage;
