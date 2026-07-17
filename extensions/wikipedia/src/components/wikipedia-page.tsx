import { Action, ActionPanel, Detail, getPreferenceValues, Icon } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import dedent from "dedent";
import { Fragment, useEffect } from "react";

import {
  formatMetadataValue,
  processMetadata,
  renderContent,
  replaceLinks,
  toSentenceCase,
  toTitleCase,
} from "../utils/formatting";
import { Locale } from "../utils/language";
import { useRecentArticles } from "../utils/recents";

import { ChangeLanguageSubmenu } from "./change-language-submenu";

import { usePageData } from "@/hooks/usePageData";

const preferences = getPreferenceValues();

const openInBrowser = preferences.openIn === "browser";

export default function WikipediaPage({ title, language }: { title: string; language: Locale }) {
  const { addToReadArticles } = useRecentArticles();
  const [showMetadata, setShowMetadata] = useCachedState("showMetadata", false);

  const { page, content, metadata, links, isLoading } = usePageData(title, language);

  useEffect(() => {
    addToReadArticles({ title, language });
  }, [title, language]);

  const body = content ? renderContent(content, 2, links, language, openInBrowser) : "";

  const markdown = page
    ? dedent`
  # ${page.title}

  ${page.description ? `>${toSentenceCase(page.description)}\n\n` : ""}

  ${replaceLinks(page.extract, language, links, openInBrowser)}

  ${page.thumbnail?.source ? `![](${page.thumbnail?.source})` : ""}

  ${body ? "---" : ""}

  ${body}`
    : "";

  if (!page) {
    return null;
  }

  return (
    <Detail
      navigationTitle={title}
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        showMetadata ? (
          <Detail.Metadata>
            {processMetadata(metadata).map(({ key, title, value }) => {
              if (Array.isArray(value)) {
                if (value.length === 0) return null;

                if (value[0]?.date) {
                  return (
                    <Fragment key={key}>
                      <Detail.Metadata.TagList title={`${title} (Date)`}>
                        {value.filter(Boolean).map((item) => (
                          <Detail.Metadata.TagList.Item key={item.date} text={item.date?.toLocaleDateString()} />
                        ))}
                      </Detail.Metadata.TagList>
                      {value[0].location && (
                        <Detail.Metadata.TagList title={`${title} (Location)`}>
                          {value.filter(Boolean).map((item) => (
                            <Detail.Metadata.TagList.Item key={item.location} text={item?.location} />
                          ))}
                        </Detail.Metadata.TagList>
                      )}
                    </Fragment>
                  );
                }

                return (
                  <Detail.Metadata.TagList key={key} title={title}>
                    {value.map((item, index) => (
                      <Detail.Metadata.TagList.Item key={`${item}-${index}`} text={formatMetadataValue(key, item)} />
                    ))}
                  </Detail.Metadata.TagList>
                );
              }

              if (value instanceof Object) {
                return (
                  <Fragment key={key}>
                    {Object.entries(value).map(([key, value]) => (
                      <Detail.Metadata.Label
                        key={key}
                        title={`${title} (${toTitleCase(key)})`}
                        text={formatMetadataValue(key, value)}
                      />
                    ))}
                  </Fragment>
                );
              }

              if (typeof value !== "string") {
                return null;
              }

              return <Detail.Metadata.Label key={key} title={title} text={formatMetadataValue(key, value)} />;
            })}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={page.content_urls.desktop.page} />
          <Action
            icon={Icon.AppWindowSidebarRight}
            title="Toggle Metadata"
            onAction={() => setShowMetadata(!showMetadata)}
          />
          <ChangeLanguageSubmenu title={title} language={language} />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd"], key: "." }}
              title="Copy URL"
              content={page.content_urls.desktop.page}
            />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              title="Copy Title"
              content={title}
            />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              title="Copy Subtitle"
              content={page.description}
            />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["ctrl", "shift"], key: "." }}
              title="Copy Summary"
              content={page.extract}
            />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["ctrl", "shift"], key: "," }}
              title="Copy Contents"
              content={body}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ActionPanel.Submenu
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              title="Open Link"
              icon={Icon.Window}
              isLoading={isLoading}
            >
              {links?.map((link: string) => {
                if (openInBrowser) {
                  return (
                    <Action.OpenInBrowser
                      key={link}
                      title={link}
                      url={`https://${language.split("-").at(0)}.wikipedia.org/wiki/${link}`}
                    />
                  );
                }
                return (
                  <Action.Push title={link} key={link} target={<WikipediaPage title={link} language={language} />} />
                );
              })}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
