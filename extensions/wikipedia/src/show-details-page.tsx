import { Action, ActionPanel, Detail } from "@raycast/api";
import { getPageData, getPageContent, getPageMetadata } from "./wikipedia";
import { useCachedPromise } from "@raycast/utils";

interface Node {
  title: string;
  content: string;
  items?: Node[];
}

const excludedTitles = ["See also", "References", "External links", "Further reading"];

function renderContent(nodes: Node[], level = 2): string {
  return nodes
    .filter((node) => node.content || node.content.length > 0)
    .filter((node) => !excludedTitles.includes(node.title))
    .map((node) => {
      const title = `${"#".repeat(level)} ${node.title}`;
      const content = node.content;
      const items = node.items ? renderContent(node.items, level + 1) : "";
      return `${title}\n\n${content}\n\n${items}`;
    })
    .join("\n\n");
}

function ShowDetailsPage({ title, language }: { title: string; language: string }) {
  const { data: page } = useCachedPromise(getPageData, [title, language]);
  const { data: content } = useCachedPromise(getPageContent, [title, language]);

  const markdown = `
  ![](${page.thumbnail?.source})
  
  # ${page.title}
  
  > ${page.description ? page.description : ""}
  
  ${page.extract}

  ---
  
  ${content ? renderContent(content) : ""}
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
