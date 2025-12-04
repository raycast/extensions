import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import React from "react";
import { Block } from "../hooks/useSearch";
import Config from "../Config";
import CreateDocumentItem from "./CreateDocumentItem";

type ListBlocksParams = {
  isLoading: boolean;
  onSearchTextChange: (text: string) => void;
  blocks: Block[];
  query: string;
  config: Config | null;
  searchBarAccessory?: any; // Necessary due to Raycast API type conflicts. Keep it that way.
};

export default function ListBlocks(params: ListBlocksParams) {
  const { isLoading, onSearchTextChange, blocks, query, config, searchBarAccessory } = params;
  const spaceID = config?.primarySpace()?.spaceID || "";
  const showSpaceInfo = config ? config.getEnabledSpaces().length > 1 : false;

  return (
    <List isLoading={isLoading} onSearchTextChange={onSearchTextChange} searchBarAccessory={searchBarAccessory}>
      {blocks.map((block) => (
        <BlockItem key={`${block.spaceID}-${block.id}`} block={block} config={config} showSpaceInfo={showSpaceInfo} />
      ))}
      {query.length > 0 && (
        <List.Section title="Create new document">
          <CreateDocumentItem query={query} spaceID={spaceID} />
        </List.Section>
      )}
    </List>
  );
}

const BlockItem = ({
  block,
  config,
  showSpaceInfo,
}: {
  block: Block;
  config: Config | null;
  showSpaceInfo?: boolean;
}) => {
  const spaceDisplayName = config?.getSpaceDisplayName(block.spaceID) || block.spaceID;

  return (
    <List.Item
      icon={block.entityType === "document" ? Icon.Document : Icon.Text}
      subtitle={block.content}
      title={block.documentName || block.content}
      accessories={
        showSpaceInfo
          ? [
              {
                tag: {
                  value: spaceDisplayName,
                  color: Color.SecondaryText,
                },
              },
            ]
          : undefined
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Craft"
            url={`craftdocs://open?blockId=${block.id}&spaceId=${block.spaceID}`}
          />
        </ActionPanel>
      }
    />
  );
};
