import { Color, Icon, List } from "@raycast/api";
import { folderName, enclosingFolderName } from "../utils";
import { ReactNode } from "react";
import { SpotlightSearchResult } from "../types";

interface FolderListSectionProps {
  title: string;
  results: SpotlightSearchResult[];
  isShowingDetail: boolean;
  resultIsPinned: (result: SpotlightSearchResult) => boolean;
  renderActions: (result: SpotlightSearchResult, resultIndex: number) => ReactNode;
}

export function FolderListSection({
  title,
  results,
  isShowingDetail,
  resultIsPinned,
  renderActions,
}: FolderListSectionProps) {
  return (
    <List.Section title={title}>
      {results.map((result: SpotlightSearchResult, resultIndex: number) => (
        <List.Item
          id={`result-${resultIndex.toString()}`}
          key={resultIndex}
          title={folderName(result)}
          subtitle={!isShowingDetail ? enclosingFolderName(result) : ""}
          icon={{ fileIcon: result.path }}
          accessories={resultIsPinned(result) ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }] : []}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Metadata" />
                  <List.Item.Detail.Metadata.Label title="Name" text={result.kMDItemFSName} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Where" text={result.path} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Type" text={result.kMDItemKind} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Created"
                    text={result.kMDItemFSCreationDate?.toLocaleString()}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Modified"
                    text={result.kMDItemContentModificationDate?.toLocaleString()}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Last used"
                    text={result.kMDItemLastUsedDate?.toLocaleString() || "-"}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Use count"
                    text={result.kMDItemUseCount?.toLocaleString() || "-"}
                  />
                  <List.Item.Detail.Metadata.Separator />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={renderActions(result, resultIndex)}
        />
      ))}
    </List.Section>
  );
}
