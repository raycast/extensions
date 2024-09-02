import { Action, ActionPanel, Icon, List, Image, showToast, Toast } from "@raycast/api";
import { PromptDetail } from "./PromptDetail";
import { getAvatarIcon, usePromise } from "@raycast/utils";
import { fetchPromptDetails } from "../utils";
import { useEffect } from "react";

interface Props {
  slug: string;
  section: string;
  setShowingDetail: (showingDetail: boolean) => void;
  showingDetail: boolean;
}

export const PromptListItem = ({ slug, section, showingDetail, setShowingDetail }: Props) => {
  const { data: prompt, isLoading, error } = usePromise(() => fetchPromptDetails(slug));

  useEffect(() => {
    if (error) {
      showToast(Toast.Style.Failure, "Failed to load prompt", error.message);
    }
  }, [error]);

  const props = showingDetail
    ? {
        detail: (
          <List.Item.Detail
            markdown={`${prompt?.content.substring(0, 200)}...`}
            isLoading={isLoading || prompt === undefined}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label text={section} title={prompt?.title || ""} />
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
      key={prompt?.slug}
      title={prompt?.title || ""}
      {...props}
      actions={
        <ActionPanel>
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
        </ActionPanel>
      }
    />
  );
};
