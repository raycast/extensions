import { Action, ActionPanel, Grid, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import WikipediaPage from "@/components/wikipedia-page";
import { getPageData } from "@/utils/api";
import { toSentenceCase } from "@/utils/formatting";
import { Locale } from "@/utils/language";
import { openInBrowser, prefersListView } from "@/utils/preferences";
import { useRecentArticles } from "@/utils/recents";

const View = prefersListView ? List : Grid;

export function PageItem({ search, title, language }: { search: string; title: string; language: Locale }) {
  const { data: page } = useCachedPromise(getPageData, [title, language]);
  const { clearReadArticles, removeFromReadArticles } = useRecentArticles();

  return (
    <View.Item
      content={{ source: page?.thumbnail?.source || Icon.Image }}
      icon={{ source: page?.thumbnail?.source || "../assets/wikipedia.png" }}
      id={title}
      title={title}
      subtitle={page?.description ? toSentenceCase(page.description) : ""}
      actions={
        <ActionPanel>
          {page?.content_urls &&
            (openInBrowser ? (
              <>
                <Action.OpenInBrowser url={page?.content_urls.desktop.page || ""} />
                <Action.Push
                  icon={Icon.Window}
                  title="Show Details"
                  target={<WikipediaPage title={title} language={language} />}
                />
              </>
            ) : (
              <>
                <Action.Push
                  icon={Icon.Window}
                  title="Show Details"
                  target={<WikipediaPage title={title} language={language} />}
                />
                <Action.OpenInBrowser url={page?.content_urls.desktop.page || ""} />
              </>
            ))}
          <Action.OpenInBrowser
            title="Search in Browser"
            url={`https://${language}.wikipedia.org/w/index.php?fulltext=1&profile=advanced&search=${search}&title=Special%3ASearch&ns0=1`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <ActionPanel.Section>
            {page?.content_urls && (
              <Action.CopyToClipboard
                shortcut={{ modifiers: ["cmd"], key: "." }}
                title="Copy URL"
                content={page?.content_urls.desktop.page || ""}
              />
            )}
            {page?.content_urls && (
              <Action.CopyToClipboard
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                title="Copy Title"
                content={title}
              />
            )}
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              title="Copy Subtitle"
              content={page?.description ?? ""}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete Recent Article"
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              icon={Icon.Trash}
              onAction={() => removeFromReadArticles({ title, language })}
            />
            <Action
              title="Delete All Recent Articles"
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.RemoveAll}
              icon={Icon.Trash}
              onAction={clearReadArticles}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
