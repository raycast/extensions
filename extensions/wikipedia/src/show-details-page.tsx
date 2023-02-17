import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { getPageData, getPageContent, getPageMetadata, getPageLinks, getAvailableLanguages } from "./utils/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { useState } from "react";
import { toTitleCase } from "./utils/string";
import { excludedMetatadataLabels, excludedMetatadataValues, excludedTitles, languages } from "./utils/constants";

interface Node {
  title: string;
  content: string;
  items?: Node[];
}

function renderContent(nodes: Node[], level: number, links: string[] = [], language = "en"): string {
  return nodes
    .filter((node) => node.content || node.content.length > 0)
    .filter((node) => !excludedTitles.includes(node.title))
    .map((node) => {
      const title = `${"#".repeat(level)} ${node.title}`;

      let content = node.content;
      links.forEach((link) => {
        const regex = new RegExp(`\\b${link}\\b`, "g");
        content = content.replaceAll(regex, `[${link}](https://${language}.wikipedia.org/wiki/${encodeURI(link)})`);
      });

      const items = node.items ? renderContent(node.items, level + 1, links, language) : "";
      return `${title}\n\n${content}\n\n${items}`;
    })
    .join("\n\n");
}

function ShowDetailsPage({ title }: { title: string }) {
  const [language, setLanguage] = useCachedState("language", "en");
  const [showMetadata, setShowMetadata] = useState(false);
  const { data: page, isLoading: isLoadingPage } = useCachedPromise(getPageData, [title, language]);
  const { data: content, isLoading: isLoadingContent } = usePromise(getPageContent, [title, language]);
  const { data: metadata, isLoading: isLoadingMetadata } = usePromise(getPageMetadata, [title, language]);
  const { data: links, isLoading: isLoadingLinks } = usePromise(getPageLinks, [title, language]);
  const { data: availableLanguages, isLoading: isLoadingLanguages } = usePromise(getAvailableLanguages, [
    title,
    language,
  ]);

  const markdown = page
    ? `
  # ${page.title}
  ${page.description ? `>${page.description}\n\n` : ""}
  
  ${page.extract}

  ![](${page.thumbnail?.source})
  
  ---
  
  ${content ? renderContent(content, 2, links, language) : ""}
  `
    : "";

  return (
    <Detail
      navigationTitle={title}
      isLoading={isLoadingPage || isLoadingContent || isLoadingMetadata || isLoadingLinks || isLoadingLanguages}
      markdown={markdown}
      metadata={
        showMetadata && metadata ? (
          <Detail.Metadata>
            {Object.entries(metadata)
              .filter(([label]) => !excludedMetatadataLabels.includes((label as any).toString()))
              .filter(([, value]) => !excludedMetatadataValues.includes((value as any).toString()))
              .map(([label, value]) => {
                const title = toTitleCase(label);

                if (Array.isArray(value)) {
                  return (
                    <Detail.Metadata.TagList key={label} title={title}>
                      {value.map((item) => (
                        <Detail.Metadata.TagList.Item key={item} text={(item as any).toString()} />
                      ))}
                    </Detail.Metadata.TagList>
                  );
                }

                return <Detail.Metadata.Label key={label} title={title} text={(value as any).toString()} />;
              })}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={page?.content_urls?.desktop.page} />
          <Action
            icon={Icon.AppWindowSidebarRight}
            title="Toggle Metadata"
            onAction={() => setShowMetadata(!showMetadata)}
          />
          <ActionPanel.Submenu
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            title="Change Language"
            icon={languages.find((l) => l.value === language)?.icon}
            isLoading={isLoadingLanguages}
          >
            {languages
              .filter(({ value }) => value !== language)
              .filter(({ value }) => availableLanguages?.includes(value))
              .map((language) => (
                <Action
                  key={language.value}
                  icon={language.icon}
                  title={language.title}
                  onAction={() => setLanguage(language.value)}
                />
              ))}
          </ActionPanel.Submenu>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd"], key: "." }}
              title="Copy URL"
              content={page?.content_urls?.desktop.page}
            />
            <Action.CopyToClipboard shortcut={{ modifiers: ["cmd"], key: "," }} title="Copy Title" content={title} />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              title="Copy Description"
              content={page?.description}
            />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["ctrl", "shift"], key: "," }}
              title="Copy Summary"
              content={page?.extract}
            />
            <ActionPanel.Submenu title="Copy Metadata" icon={Icon.CopyClipboard} isLoading={isLoadingMetadata}>
              {metadata
                ? Object.entries(metadata)
                    .filter(([label]) => !excludedMetatadataLabels.includes((label as any).toString()))
                    .filter(([, value]) => !excludedMetatadataValues.includes((value as any).toString()))
                    .map(([label, value]) => {
                      const title = toTitleCase(label);
                      return <Action.CopyToClipboard key={label} title={title} content={(value as any).toString()} />;
                    })
                : null}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default ShowDetailsPage;
