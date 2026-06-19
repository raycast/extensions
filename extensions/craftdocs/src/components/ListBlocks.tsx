import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { ComponentProps } from "react";
import { CraftConfig } from "../Config";
import { Block } from "../lib/search";
import CreateDocumentItem from "./CreateDocumentItem";

type SearchBarAccessory = ComponentProps<typeof List>["searchBarAccessory"];

type ListBlocksParams = {
  isLoading: boolean;
  onSearchTextChange: (text: string) => void;
  blocks: Block[];
  query: string;
  config: CraftConfig | null;
  createDocumentSpaceId?: string;
  searchBarAccessory?: SearchBarAccessory;
};

export default function ListBlocks(params: ListBlocksParams) {
  const {
    isLoading,
    onSearchTextChange,
    blocks,
    query,
    config,
    createDocumentSpaceId = "",
    searchBarAccessory,
  } = params;
  const showSpaceInfo = config ? config.enabledSpaces.length > 1 : false;

  return (
    <List isLoading={isLoading} onSearchTextChange={onSearchTextChange} searchBarAccessory={searchBarAccessory}>
      {blocks.map((block) => (
        <BlockItem key={`${block.spaceID}-${block.id}`} block={block} config={config} showSpaceInfo={showSpaceInfo} />
      ))}
      {query.length > 0 && (
        <List.Section title="Create new Document">
          <CreateDocumentItem query={query} spaceID={createDocumentSpaceId} />
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
  config: CraftConfig | null;
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
