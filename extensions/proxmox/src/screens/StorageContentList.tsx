import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useStorageContent } from "@/hooks/use-storage-content";
import { formatStorageSize } from "@/utils/format";
import { ErrorGuard } from "@/components/ErrorGuard";

type StorageContentListProps = {
  node: string;
  id: string;
};

export const StorageContentList = ({ node, id }: StorageContentListProps) => {
  const { data, isLoading, showErrorScreen, revalidate } = useStorageContent(node, id);

  return (
    <ErrorGuard showErrorScreen={showErrorScreen}>
      <List isLoading={isLoading} isShowingDetail>
        {data?.map((item) => (
          <List.Item
            key={item.volid}
            title={item.name ?? item.volid}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Name" text={item.name ?? item.volid} />
                    <List.Item.Detail.Metadata.Label title="Notes" text={item.notes ?? ""} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Content" text={item.content ?? ""} />
                    <List.Item.Detail.Metadata.Label title="Format" text={item.format ?? ""} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Size" text={formatStorageSize(item.size)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        ))}
        <List.EmptyView title="No content found for this storage" />
      </List>
    </ErrorGuard>
  );
};
