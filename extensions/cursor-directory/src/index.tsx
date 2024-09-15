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
import { PromptDetail } from "./components/PromptDetail";
import { fetchPrompts } from "./api";

export default function Command() {
  const { show_detailed_view, default_prompts_list } = getPreferenceValues<Preferences>();

  const [error, setError] = useState<Error | undefined>(undefined);
  const [showingDetail, setShowingDetail] = useState<boolean>(show_detailed_view);
  const [popularOnly, setPopularOnly] = useState<boolean>(default_prompts_list === "popular");

  const { data, isLoading, revalidate } = usePromise(async () => {
    try {
      return await fetchPrompts(popularOnly);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return [];
    }
  });

  useEffect(() => {
    if (error) {
      console.error("Error fetching prompts: ", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong: ",
        message: error.message,
      });
    }
  }, [error]);

  const prompts = data || [];

  const sections = getSections(prompts, false);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Prompts"
          onChange={(newValue) => {
            setPopularOnly(newValue === "popular");
            revalidate();
          }}
          defaultValue={popularOnly ? "popular" : "all"}
        >
          <List.Dropdown.Item title="All Prompts" value="all" />
          <List.Dropdown.Item title="Popular Prompts" value="popular" />
        </List.Dropdown>
      }
    >
      {sections.length > 0 &&
        sections.map((section) => (
          <List.Section key={section.name} title={section.name}>
            {section.slugs.map((slug, index) => {
              const prompt = prompts.find((item) => item.slug === slug);
              const props = showingDetail
                ? {
                    detail: (
                      <List.Item.Detail
                        markdown={`${processContent(prompt?.content || "").substring(0, 200)}...`}
                        isLoading={isLoading || prompt === undefined}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label text={section.name} title={prompt?.title || ""} />
                            <List.Item.Detail.Metadata.Label
                              title="Created by"
                              text={prompt?.author.name || ""}
                              icon={{
                                source: prompt?.author.avatar || getAvatarIcon(prompt?.author.name || ""),
                                mask: Image.Mask.Circle,
                              }}
                            />
                            {popularOnly && prompt?.count && (
                              <List.Item.Detail.Metadata.Label
                                title="Used by"
                                text={prompt.count > 1 ? `${prompt.count} people` : `${prompt.count} person`}
                              />
                            )}
                            {prompt?.tags && prompt.tags.length > 0 && (
                              <>
                                <List.Item.Detail.Metadata.Separator />
                                <List.Item.Detail.Metadata.TagList title="Tags">
                                  {prompt.tags.slice(0, 3).map((tag) => (
                                    <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                                  ))}
                                </List.Item.Detail.Metadata.TagList>
                              </>
                            )}
                            {prompt?.libs && prompt.libs.length > 0 && (
                              <List.Item.Detail.Metadata.TagList title="Libraries">
                                {prompt.libs.slice(0, 3).map((lib) => (
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
                      { text: prompt?.tags.slice(0, 3).join(", ") },
                      ...(popularOnly && prompt?.count ? [{ icon: Icon.Person, text: prompt.count.toString() }] : []),
                    ],
                  };

              return (
                <List.Item
                  key={prompt?.slug || index}
                  title={prompt?.title || ""}
                  {...props}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Actions">
                        <Action.Push
                          title="View Prompt"
                          icon={Icon.Text}
                          target={<PromptDetail prompt={prompt!} popularOnly={popularOnly} />}
                        />
                        <Action
                          title="Copy Prompt"
                          icon={Icon.Clipboard}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                          onAction={async () => {
                            await Clipboard.copy(prompt?.content || "");
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
