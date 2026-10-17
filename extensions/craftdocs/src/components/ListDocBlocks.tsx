import { Action, ActionPanel, Color, List } from "@raycast/api";
import type { ComponentProps } from "react";
import { CraftConfig } from "../Config";
import { DocBlock } from "../lib/search";
import CreateDocumentItem from "./CreateDocumentItem";

type SearchBarAccessory = ComponentProps<typeof List>["searchBarAccessory"];

type ListDocBlocksParams = {
  resultsLoading: boolean;
  setQuery: (query: string) => void;
  results: DocBlock[];
  query: string;
  config: CraftConfig | null;
  createDocumentSpaceId?: string;
  searchBarAccessory?: SearchBarAccessory;
};

export default function ListDocBlocks({
  resultsLoading,
  results,
  setQuery,
  query,
  config,
  createDocumentSpaceId = "",
  searchBarAccessory,
}: ListDocBlocksParams) {
  const showSpaceInfo = config ? config.enabledSpaces.length > 1 : false;
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
        <List.Section title="Create new Document">
          <CreateDocumentItem query={query} spaceID={createDocumentSpaceId} />
        </List.Section>
      )}
    </List>
  );
}
