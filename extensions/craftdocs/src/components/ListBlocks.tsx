import {Action, ActionPanel, List } from "@raycast/api";
import { Block } from "../hooks/useSearch";

type ListBlocksParams = {
  isLoading: boolean;
  onSearchTextChange: (text: string) => void;
  blocks: Block[];
};

export default function ListBlocks({ isLoading, onSearchTextChange, blocks }: ListBlocksParams) {
  return (
    <List isLoading={isLoading} throttle={true} onSearchTextChange={onSearchTextChange}>
      {blocks.map((block) => (
        <BlockItem key={block.id} block={block} />
      ))}
    </List>
  );
}

const BlockItem = ({ block }: { block: Block }) => (
  <List.Item
    icon={block.entityType === "document" ? "📄" : "📑"}
    title={block.content}
    accessoryTitle={block.documentName}
    actions={
    <ActionPanel>
      <Action.OpenInBrowser url={`craftdocs://open?blockId=${block.id}&spaceId=${block.spaceID}`} />
    </ActionPanel>
  }
  />
);
