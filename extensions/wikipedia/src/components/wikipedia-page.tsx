import { Action, ActionPanel, Detail, getPreferenceValues, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { getPageContent, getPageData, getPageLinks, getPageMetadata } from "../utils/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { Fragment } from "react";
import { processMetadata, renderContent, replaceLinks, toSentenceCase, toTitleCase } from "../utils/formatting";
import { ChangeLanguageSubmenu } from "./change-language-submenu";
import { useLanguage } from "../utils/language";
import Style = Toast.Style;

const preferences = getPreferenceValues();

const openInBrowser = preferences.openIn === "browser";

function formatMetadataValue(label: string, value?: Date | null | string) {
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (!value) {
    return "N/A";
  }

  if (label === "coordinates") {
    return value.toString().split("|").slice(0, 2).join(", ");
  }

  return value.toString();
}

export default function WikipediaPage({ title }: { title: string }) {
  const [language] = useLanguage();
  const [showMetadata, setShowMetadata] = useCachedState("showMetadata", false);
  const { data: content, isLoading: isLoadingContent } = usePromise(getPageContent, [title, language]);
  const { data: metadata, isLoading: isLoadingMetadata } = usePromise(getPageMetadata, [title, language]);
  const { data: links, isLoading: isLoadingLinks } = usePromise(getPageLinks, [title, language]);
  const { data: page, isLoading: isLoadingPage } = useCachedPromise(getPageData, [title, language], {
    onError: () => {
      showToast({
        title: "Page not found",
        message: title,
        style: Style.Failure,
      });
      popToRoot();
    },
  });

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

  if (!page) {
    return null;
  }

  return (
    <Detail
      navigationTitle={title}
      isLoading={isLoadingPage || isLoadingContent || isLoadingMetadata || isLoadingLinks}
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
                    {value.map((item) => (
                      <Detail.Metadata.TagList.Item key={item} text={formatMetadataValue(key, item)} />
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
          <ChangeLanguageSubmenu title={title} />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd"], key: "." }}
              title="Copy URL"
              content={page.content_urls.desktop.page}
            />
            <Action.CopyToClipboard shortcut={{ modifiers: ["cmd"], key: "," }} title="Copy Title" content={title} />
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
