import { Action, ActionPanel, Detail, getPreferenceValues, Icon, useNavigation, Keyboard } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import dedent from "dedent";
import { Fragment, useEffect, useState } from "react";

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

type HistoryEntry = { title: string; language: Locale };

export default function WikipediaPage({ title, language }: { title: string; language: Locale }) {
  const { pop } = useNavigation();
  const { addToReadArticles } = useRecentArticles();
  const [showMetadata, setShowMetadata] = useCachedState("showMetadata", false);
  const [history, setHistory] = useState<HistoryEntry[]>([{ title, language }]);
  const [index, setIndex] = useState(0);

  const current = history[index];
  const canGoForward = index < history.length - 1;

  const { page, content, metadata, links, isLoading } = usePageData(current.title, current.language);

  useEffect(() => {
    addToReadArticles({ title: current.title, language: current.language });
  }, [current.title, current.language]);

  function goBack() {
    if (index > 0) {
      setIndex(index - 1);
      return;
    }

    pop();
  }

  function goForward() {
    if (canGoForward) {
      setIndex(index + 1);
    }
  }

  function navigate(nextTitle: string, nextLanguage: Locale) {
    setHistory((entries: HistoryEntry[]) => [
      ...entries.slice(0, index + 1),
      { title: nextTitle, language: nextLanguage },
    ]);
    setIndex(index + 1);
  }

  const body = content ? renderContent(content, 2, links, current.language, openInBrowser) : "";

  const markdown = page
    ? dedent`
  # ${page.title}

  ${page.description ? `>${toSentenceCase(page.description)}\n\n` : ""}

  ${replaceLinks(page.extract, current.language, links, openInBrowser)}

  ${page.thumbnail?.source ? `![](${page.thumbnail?.source})` : ""}

  ${body ? "---" : ""}

  ${body}`
    : "";

  return (
    <Detail
      navigationTitle={current.title}
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
          {page?.content_urls && <Action.OpenInBrowser url={page.content_urls.desktop.page} />}
          <Action
            icon={Icon.AppWindowSidebarRight}
            title="Toggle Metadata"
            onAction={() => setShowMetadata(!showMetadata)}
          />
          <ChangeLanguageSubmenu title={current.title} language={current.language} onSelect={navigate} />
          <ActionPanel.Section>
            <Action icon={Icon.ArrowLeft} title="Back" shortcut={{ modifiers: [], key: "[" }} onAction={goBack} />
            <Action
              icon={Icon.ArrowRight}
              title="Forward"
              shortcut={{ modifiers: [], key: "]" }}
              onAction={goForward}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {page?.content_urls && (
              <Action.CopyToClipboard
                shortcut={Keyboard.Shortcut.Common.Pin}
                title="Copy URL"
                content={page.content_urls.desktop.page}
              />
            )}
            <Action.CopyToClipboard
              shortcut={Keyboard.Shortcut.Common.CopyName}
              title="Copy Title"
              content={current.title}
            />
            <Action.CopyToClipboard
              shortcut={Keyboard.Shortcut.Common.CopyPath}
              title="Copy Subtitle"
              content={page?.description ?? ""}
            />
            <Action.CopyToClipboard
              shortcut={{
                macOS: { modifiers: ["ctrl", "shift"], key: "." },
                Windows: { modifiers: ["ctrl", "shift"], key: "." },
              }}
              title="Copy Summary"
              content={page?.extract ?? ""}
            />
            <Action.CopyToClipboard
              shortcut={{
                macOS: { modifiers: ["ctrl", "shift"], key: "," },
                Windows: { modifiers: ["ctrl", "shift"], key: "," },
              }}
              title="Copy Contents"
              content={body}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ActionPanel.Submenu
              shortcut={Keyboard.Shortcut.Common.Open}
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
                      url={`https://${current.language.split("-").at(0)}.wikipedia.org/wiki/${link}`}
                    />
                  );
                }
                return <Action title={link} key={link} onAction={() => navigate(link, current.language)} />;
              })}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
