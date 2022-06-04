import { Action, ActionPanel, List } from "@raycast/api";
import { Block } from "../hooks/useSearch";
import Config from "../Config";
import CreateDocumentItem from "./CreateDocumentItem";

type ListBlocksParams = {
  isLoading: boolean;
  onSearchTextChange: (text: string) => void;
  blocks: Block[];
  query: string;
  config: Config | null;
};

export default function ListBlocks(params: ListBlocksParams) {
  const { isLoading, onSearchTextChange, blocks, query, config } = params;
  const spaceID = config?.primarySpace()?.spaceID || "";

  return (
    <List isLoading={isLoading} onSearchTextChange={onSearchTextChange}>
      {blocks.map((block) => (
        <BlockItem key={block.id} block={block} />
      ))}
      {query.length > 0 && (
        <List.Section title="Create new document">
          <CreateDocumentItem query={query} spaceID={spaceID} />
        </List.Section>
      )}
    </List>
  );
}

const BlockItem = ({ block }: { block: Block }) => (
  <List.Item
    icon={block.entityType === "document" ? "📄" : "📑"}
    subtitle={block.content}
    title={block.documentName || block.content}
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
