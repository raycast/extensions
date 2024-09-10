import { List, Image, ActionPanel, Action, Icon, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { getAvatarIcon, usePromise } from "@raycast/utils";
import { getSections } from "./utils";
import { useEffect, useState } from "react";
import { PromptDetail } from "./components/PromptDetail";
import { fetchPrompts } from "./api";

export default function Command() {
  const [error, setError] = useState<Error | undefined>(undefined);

  const { data, isLoading } = usePromise(async () => {
    try {
      return await fetchPrompts();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return [];
    }
  });

  const [showingDetail, setShowingDetail] = useState<boolean>(true);

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

  const sections = getSections(prompts);

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail}>
      {sections.length > 0 &&
        sections.map((section) => (
          <List.Section key={section.name} title={section.name}>
            {section.slugs.map((slug, index) => {
              const prompt = prompts.find((item) => item.slug === slug);

              const props = showingDetail
                ? {
                    detail: (
                      <List.Item.Detail
                        markdown={`${prompt?.content.substring(0, 200)}...`}
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
                              <List.Item.Detail.Metadata.TagList title="Libs">
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
                : { accessories: [{ text: prompt?.tags.join(", ") }] };

              return (
                <List.Item
                  key={prompt?.slug || index}
                  title={prompt?.title || ""}
                  {...props}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Actions">
                        <Action.Push title="View Prompt" icon={Icon.Text} target={<PromptDetail prompt={prompt!} />} />
                        <Action.CopyToClipboard
                          title="Copy Prompt"
                          icon={Icon.Clipboard}
                          content={prompt?.content || ""}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                        <Action
                          title="Toggle Detail"
                          icon={Icon.List}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={() => setShowingDetail(!showingDetail)}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Settings">
                        <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
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
