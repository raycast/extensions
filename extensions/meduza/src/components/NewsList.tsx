import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { format } from "timeago.js";
import { Language } from "../types";
import { useFeedData } from "../hooks/useFeedData";
import { ArticleDetail } from "./ArticleDetail";

export function NewsList(): JSX.Element {
  const [language, setLanguage] = useCachedState<Language>("language");
  const feedKey = language ?? "en";

  const { data: items = [], isLoading, revalidate } = useFeedData(feedKey);

  const placeholder = "Search latest articles...";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={placeholder}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Language"
          storeValue={true}
          onChange={(newValue) => setLanguage(newValue as Language)}
        >
          <List.Dropdown.Item title="English" value="en" />
          <List.Dropdown.Item title="Русский" value="ru" />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {items.map((item) => (
        <List.Item
          key={item.link}
          title={item.title}
          icon={Icon.Document}
          accessories={[{ text: format(new Date(item.pubDate), feedKey) }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Article"
                icon={Icon.Eye}
                target={<ArticleDetail article={item} locale={feedKey} />}
              />
              <Action.OpenInBrowser url={item.link} />
              <Action.CopyToClipboard content={item.link} title="Copy Link" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
