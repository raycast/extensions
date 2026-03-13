import { List } from "@raycast/api";
import type { PveStorageParsed } from "@/types";
import { useStorageStatus } from "@/hooks/use-storage-status";
import { formatNumberAsBoolean, formatStorageSize } from "@/utils/format";
import { ErrorDetailGuard } from "@/components/ErrorDetailGuard";

type StorageDetailProps = {
  storage: PveStorageParsed;
};

export const StorageDetail = ({ storage }: StorageDetailProps) => {
  const { data, showErrorScreen } = useStorageStatus(storage.node, storage.storage);

  return (
    <ErrorDetailGuard showErrorScreen={showErrorScreen}>
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={storage.storage} />
            <List.Item.Detail.Metadata.Label title="Node" text={storage.node} />
            <List.Item.Detail.Metadata.Label title="Status" text={storage.status} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Plugin Type" text={storage.plugintype} />
            {data !== undefined ? (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Total" text={formatStorageSize(data.total)} />
                <List.Item.Detail.Metadata.Label title="Used" text={formatStorageSize(data.used)} />
                <List.Item.Detail.Metadata.Label title="Available" text={formatStorageSize(data.avail)} />
              </>
            ) : (
              <List.Item.Detail.Metadata.Label title="Max disk" text={storage.maxdiskParsed} />
            )}
            <List.Item.Detail.Metadata.Label title="Shared" text={formatNumberAsBoolean(storage.shared)} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.TagList title="Content">
              {storage.contentTypes.map((content) => (
                <List.Item.Detail.Metadata.TagList.Item key={content} text={content} />
              ))}
            </List.Item.Detail.Metadata.TagList>
            {data !== undefined && (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Active" text={formatNumberAsBoolean(data.active)} />
                <List.Item.Detail.Metadata.Label title="Enabled" text={formatNumberAsBoolean(data.enabled)} />
              </>
            )}
          </List.Item.Detail.Metadata>
        }
      />
    </ErrorDetailGuard>
  );
};
