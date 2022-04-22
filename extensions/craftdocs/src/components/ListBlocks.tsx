import { Action, ActionPanel, List } from "@raycast/api";
import { Block } from "../hooks/useSearch";
import Config from "../Config";

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
    <List isLoading={isLoading} throttle={true} onSearchTextChange={onSearchTextChange}>
      {blocks.map((block) => (
        <BlockItem key={block.id} block={block} />
      ))}
      {blocks.length === 0 && <CreateDocumentItem query={query} spaceID={spaceID} />}
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
        <Action.OpenInBrowser url={`craftdocs://open?blockId=${block.id}&spaceId=${block.spaceID}`} />
      </ActionPanel>
    }
  />
);

const CreateDocumentItem = ({ query, spaceID }: { query: string; spaceID: string }) => (
  <List.Item
    title={`Create document '${query}'`}
    actions={
      <ActionPanel>
        <Action.OpenInBrowser
          url={`craftdocs://createdocument?spaceId=${spaceID}&title=${encodeURIComponent(query)}&content=&folderId=`}
        />
      </ActionPanel>
    }
  />
);
