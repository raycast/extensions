import {
  List,
  Image,
  ActionPanel,
  Action,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  showHUD,
  Clipboard,
  getPreferenceValues,
} from "@raycast/api";
import { getAvatarIcon, usePromise } from "@raycast/utils";
import { getSections, processContent } from "./utils";
import { useState, useEffect } from "react";
import { CursorRuleDetail } from "./components/CursorRuleDetail";
import { fetchCursorRules } from "./api";

export default function Command() {
  const { show_detailed_view, default_cursor_rules_list } = getPreferenceValues<Preferences>();

  const [error, setError] = useState<Error | undefined>(undefined);
  const [showingDetail, setShowingDetail] = useState<boolean>(show_detailed_view);
  const [popularOnly, setPopularOnly] = useState<boolean>(default_cursor_rules_list === "popular");

  const { data, isLoading, revalidate } = usePromise(async () => {
    try {
      return await fetchCursorRules(popularOnly);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return [];
    }
  });

  useEffect(() => {
    if (error) {
      console.error("Error fetching cursor rules: ", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong: ",
        message: error.message,
      });
    }
  }, [error]);

  const cursorRules = data || [];

  const sections = getSections(cursorRules, false);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Cursor Rules"
          onChange={(newValue) => {
            setPopularOnly(newValue === "popular");
            revalidate();
          }}
          defaultValue={popularOnly ? "popular" : "all"}
        >
          <List.Dropdown.Item title="All Cursor Rules" value="all" />
          <List.Dropdown.Item title="Popular Cursor Rules" value="popular" />
        </List.Dropdown>
      }
    >
      {sections.length > 0 &&
        sections.map((section) => (
          <List.Section key={section.name} title={section.name}>
            {section.slugs.map((slug, index) => {
              const cursorRule = cursorRules.find((item) => item.slug === slug);
              const props = showingDetail
                ? {
                    detail: (
                      <List.Item.Detail
                        markdown={`${processContent(cursorRule?.content || "").substring(0, 200)}...`}
                        isLoading={isLoading || cursorRule === undefined}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label text={section.name} title={cursorRule?.title || ""} />
                            <List.Item.Detail.Metadata.Label
                              title="Created by"
                              text={cursorRule?.author.name || ""}
                              icon={{
                                source: cursorRule?.author.avatar || getAvatarIcon(cursorRule?.author.name || ""),
                                mask: Image.Mask.Circle,
                              }}
                            />
                            {popularOnly && cursorRule?.count && (
                              <List.Item.Detail.Metadata.Label
                                title="Used by"
                                text={
                                  cursorRule.count > 1 ? `${cursorRule.count} people` : `${cursorRule.count} person`
                                }
                              />
                            )}
                            {cursorRule?.tags && cursorRule.tags.length > 0 && (
                              <>
                                <List.Item.Detail.Metadata.Separator />
                                <List.Item.Detail.Metadata.TagList title="Tags">
                                  {cursorRule.tags.slice(0, 3).map((tag) => (
                                    <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                                  ))}
                                </List.Item.Detail.Metadata.TagList>
                              </>
                            )}
                            {cursorRule?.libs && cursorRule.libs.length > 0 && (
                              <List.Item.Detail.Metadata.TagList title="Libraries">
                                {cursorRule.libs.slice(0, 3).map((lib) => (
                                  <List.Item.Detail.Metadata.TagList.Item key={lib} text={lib} />
                                ))}
                              </List.Item.Detail.Metadata.TagList>
                            )}
                          </List.Item.Detail.Metadata>
                        }
                      />
                    ),
                  }
                : {
                    accessories: [
                      { text: cursorRule?.tags.slice(0, 3).join(", ") },
                      ...(popularOnly && cursorRule?.count
                        ? [{ icon: Icon.Person, text: cursorRule.count.toString() }]
                        : []),
                    ],
                  };

              return (
                <List.Item
                  key={cursorRule?.slug || index}
                  title={cursorRule?.title || ""}
                  {...props}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Actions">
                        <Action.Push
                          title="View Cursor Rule"
                          icon={Icon.Text}
                          target={<CursorRuleDetail cursorRule={cursorRule!} popularOnly={popularOnly} />}
                        />
                        <Action
                          title="Copy Cursor Rule"
                          icon={Icon.Clipboard}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                          onAction={async () => {
                            await Clipboard.copy(cursorRule?.content || "");
                            await showHUD("Copied to clipboard, paste it into .cursorrules file");
                          }}
                        />
                        <Action
                          title={showingDetail ? "Show List View" : "Show Detailed View"}
                          icon={showingDetail ? Icon.List : Icon.Text}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={() => setShowingDetail(!showingDetail)}
                        />
                        {/* <Action
                          title={sortBy === "popularity" ? "Sort by Categories" : "Sort by Popularity"}
                          icon={Icon.ArrowDown}
                          shortcut={{ modifiers: ["cmd"], key: "s" }}
                          onAction={() => {
                            setSortBy(prev => prev === "popularity" ? "category" : "popularity");
                            revalidate();
                          }}
                        /> */}
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Settings">
                        <Action
                          title="Open Extension Preferences"
                          icon={Icon.Gear}
                          onAction={openExtensionPreferences}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))}
    </List>
  );
}
