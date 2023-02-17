import { Action, ActionPanel, Detail } from "@raycast/api";
import { getPageData } from "./wikipedia";
import { useCachedPromise } from "@raycast/utils";

function ShowDetailsPage({ title, language }: { title: string; language: string }) {
  const { data: page } = useCachedPromise(getPageData, [title, language]);

  const markdown = `
  # ${page.title}
  
  ${page.description ? page.description : ""}



  ---

  ${page.extract} [Read More](${page.content_urls.desktop.page})\n\n
  ![](${page.thumbnail?.source})
  `;

  return (
    <Detail
      navigationTitle={title}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={page.content_urls.desktop.page} />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd"], key: "." }}
              title="Copy URL"
              content={page.content_urls.desktop.page}
            />
            <Action.CopyToClipboard shortcut={{ modifiers: ["cmd"], key: "," }} title="Copy Title" content={title} />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              title="Copy Description"
              content={page?.description}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default ShowDetailsPage;
