import { Action, ActionPanel, Color, List } from "@raycast/api";
import { DocBlock } from "../hooks/useDocumentSearch";
import CreateDocumentItem from "./CreateDocumentItem";
import Config from "../Config";

type ListDocBlocksParams = {
  resultsLoading: boolean;
  setQuery: (query: string) => void;
  results: DocBlock[];
  query: string;
  config: Config | null;
  searchBarAccessory?: any; // Raycast-specific dropdown type, using any to avoid complex type issues
};

export default function ListDocBlocks({
  resultsLoading,
  results,
  setQuery,
  query,
  config,
  searchBarAccessory,
}: ListDocBlocksParams) {
  const showSpaceInfo = config ? config.getEnabledSpaces().length > 1 : false;
  return (
    <List
      isLoading={resultsLoading}
      isShowingDetail={true}
      onSearchTextChange={setQuery}
      searchBarAccessory={searchBarAccessory}
    >
      {results.map((doc) => (
        <List.Item
          key={`${doc.block.spaceID}-${doc.block.id}`}
          title={doc.block.content}
          accessories={
            showSpaceInfo
              ? [
                  {
                    tag: {
                      value: config?.getSpaceDisplayName(doc.block.spaceID) || doc.block.spaceID,
                      color: Color.SecondaryText,
                    },
                  },
                ]
              : undefined
          }
          detail={
            <List.Item.Detail
              markdown={doc.blocks
                .map((block) => (block.type === "code" ? "```\n" + block.content + "\n```" : block.content))
                .join("\n\n")}
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`craftdocs://open?blockId=${doc.block.id}&spaceId=${doc.block.spaceID}`} />
            </ActionPanel>
          }
        />
      ))}
      {query.length > 0 && (
        <List.Section title="Create new document">
          <CreateDocumentItem query={query} spaceID={config?.primarySpace()?.spaceID || ""} />
        </List.Section>
      )}
    </List>
  );
}
