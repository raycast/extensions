import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useState, useMemo } from "react";

interface Bucket {
  id: string;
  name: string;
  location: string;
  storageClass: string;
  created: string;
}

interface StorageBucketListProps {
  buckets: Bucket[];
  isLoading: boolean;
  onViewBucket: (bucket: Bucket) => void;
  onCreateBucket: () => void;
  onRefresh: () => void;
}

interface BucketActionsProps {
  bucket?: Bucket;
  onViewBucket?: (bucket: Bucket) => void;
  onCreateBucket: () => void;
  onRefresh: () => void;
}

function BucketActions({ bucket, onViewBucket, onCreateBucket, onRefresh }: BucketActionsProps) {
  return (
    <ActionPanel>
      {bucket && onViewBucket && <Action title="View Bucket" icon={Icon.Eye} onAction={() => onViewBucket(bucket)} />}
      <Action title="Create Bucket" icon={Icon.Plus} onAction={onCreateBucket} />
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
    </ActionPanel>
  );
}

export default function StorageBucketList({
  buckets,
  isLoading,
  onViewBucket,
  onCreateBucket,
  onRefresh,
}: StorageBucketListProps) {
  const [searchText, setSearchText] = useState("");

  const filteredBuckets = useMemo(
    () =>
      buckets.filter(
        (bucket) =>
          bucket.name.toLowerCase().includes(searchText.toLowerCase()) ||
          bucket.location.toLowerCase().includes(searchText.toLowerCase()) ||
          bucket.storageClass.toLowerCase().includes(searchText.toLowerCase()),
      ),
    [buckets, searchText],
  );

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  }

  function getStorageClassIcon(storageClass: string): { source: Icon; tintColor: string } {
    switch (storageClass.toLowerCase()) {
      case "standard":
        return { source: Icon.HardDrive, tintColor: "#4285F4" };
      case "nearline":
        return { source: Icon.HardDrive, tintColor: "#34A853" };
      case "coldline":
        return { source: Icon.HardDrive, tintColor: "#FBBC05" };
      case "archive":
        return { source: Icon.HardDrive, tintColor: "#EA4335" };
      default:
        return { source: Icon.HardDrive, tintColor: "#4285F4" };
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search buckets..."
      onSearchTextChange={setSearchText}
      navigationTitle="Storage Buckets"
      actions={<BucketActions onCreateBucket={onCreateBucket} onRefresh={onRefresh} />}
    >
      {filteredBuckets.length === 0 ? (
        <List.EmptyView
          title="No buckets found"
          description={searchText ? "Try a different search term" : "Create a bucket to get started"}
          icon={{ source: Icon.Box }}
          actions={<BucketActions onCreateBucket={onCreateBucket} onRefresh={onRefresh} />}
        />
      ) : (
        filteredBuckets.map((bucket) => (
          <List.Item
            key={bucket.id}
            title={bucket.name}
            subtitle={bucket.location}
            icon={getStorageClassIcon(bucket.storageClass)}
            accessories={[{ text: bucket.storageClass }, { text: formatDate(bucket.created), tooltip: "Created on" }]}
            actions={
              <BucketActions
                bucket={bucket}
                onViewBucket={onViewBucket}
                onCreateBucket={onCreateBucket}
                onRefresh={onRefresh}
              />
            }
          />
        ))
      )}
    </List>
  );
}
