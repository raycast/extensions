import { Action, ActionPanel, Detail, getPreferenceValues, Icon } from "@raycast/api";
import { getPageData, getPageContent, getPageMetadata, getPageLinks, getAvailableLanguages } from "./utils/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { useState } from "react";
import { escapeRegExp, toSentenceCase, toTitleCase } from "./utils/string";
import { excludedMetatadataLabels, excludedMetatadataValues, languages } from "./utils/constants";

const preferences = getPreferenceValues();

const openInBrowser = preferences.openIn === "browser";

interface Node {
  title: string;
  content: string;
  items?: Node[];
}

function replaceLinks(text: string, language: string, links: string[] = []) {
  const regex = new RegExp(`\\b(${links.map(escapeRegExp).join("|")})\\b`, "g");
  return text.replaceAll(regex, (link) => {
    const url = openInBrowser
      ? `https://${language}.wikipedia.org/wiki/${encodeURI(link)}`
      : `raycast://extensions/vimtor/wikipedia/open-page?arguments=${encodeURI(JSON.stringify({ title: link }))}`;
    return `[${link}](${url})`;
  });
}

function renderContent(nodes: Node[], level: number, links: string[] = [], language = "en"): string {
  return nodes
    .filter((node) => node.content || node.content.length > 0)
    .map((node) => {
      const title = `${"#".repeat(level)} ${node.title}`;
      const content = replaceLinks(node.content, language, links);
      const items = node.items ? renderContent(node.items, level + 1, links, language) : "";
      return `${title}\n\n${content}\n\n${items}`;
    })
    .join("\n\n");
}

export default function WikipediaPage({ title }: { title: string }) {
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

  const body = content ? renderContent(content, 2, links, language) : "";

  const markdown = page
    ? `
  # ${page.title}
  
  ${page.description ? `>${toSentenceCase(page.description)}\n\n` : ""}
  
  ${replaceLinks(page.extract, language, links)}

  ${page.thumbnail?.source ? `![](${page.thumbnail?.source})` : ""}
  
  ${body ? "---" : ""}
  
  ${body}`
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
              title="Copy Subtitle"
              content={page?.description}
            />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["ctrl", "shift"], key: "." }}
              title="Copy Summary"
              content={page?.extract}
            />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["ctrl", "shift"], key: "," }}
              title="Copy Contents"
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
          <ActionPanel.Section>
            <ActionPanel.Submenu
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              title="Open Link"
              icon={Icon.Window}
              isLoading={isLoadingLinks}
            >
              {links?.map((link: string) => {
                if (openInBrowser) {
                  return (
                    <Action.OpenInBrowser
                      key={link}
                      title={link}
                      url={`https://${language}.wikipedia.org/wiki/${link}`}
                    />
                  );
                }
                return <Action.Push title={link} key={link} target={<WikipediaPage title={link} />} />;
              })}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
