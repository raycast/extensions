import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { OpenRouterModel } from "../types";
import { getModelMarkdown, getModelMetadata } from "../utils/model-formatters";
import { getModelIcon } from "../lib/get-icon";
import { generateModelUrls } from "../utils/url-generators";
import React from "react";

interface SearchListItemProps {
  refreshModels: () => void;
  searchResult: OpenRouterModel;
}

export const SearchListItem = React.memo(function SearchListItem({ refreshModels, searchResult }: SearchListItemProps) {
  const url = generateModelUrls(searchResult.id);
  const icon = getModelIcon(searchResult);

  return (
    <List.Item
      icon={icon ?? Icon.Stars}
      title={searchResult.name}
      detail={<List.Item.Detail markdown={getModelMarkdown(searchResult)} metadata={getModelMetadata(searchResult)} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={url.model} />
            <Action.OpenInBrowser
              title="Open in Chatroom"
              url={url.chatroom}
              icon={Icon.Message}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "return" },
                Windows: { modifiers: ["ctrl"], key: "return" },
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Model ID"
              content={searchResult.id}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "return" },
                Windows: { modifiers: ["ctrl", "shift"], key: "return" },
              }}
            />
            <Action.CopyToClipboard
              title="Copy Model URL"
              content={url.model}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "c" },
                Windows: { modifiers: ["ctrl", "shift"], key: "c" },
              }}
            />
            {searchResult.hugging_face_id && (
              <Action.OpenInBrowser
                title="Open in Hugging Face"
                url={`https://huggingface.co/${searchResult.hugging_face_id}`}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "h" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "h" },
                }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh Model Data"
              icon={Icon.ArrowClockwise}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "r" }, Windows: { modifiers: ["ctrl"], key: "r" } }}
              onAction={refreshModels}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
});
