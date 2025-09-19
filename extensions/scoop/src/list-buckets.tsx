import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { scoopBucketList, scoopBucketRm, ScoopBucket } from "./scoop";
import { withToast } from "./utils";

export default function ListBucketsCommand() {
  const [buckets, setBuckets] = useState<ScoopBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshBuckets() {
    setIsLoading(true);
    const fetchedBuckets = await scoopBucketList();
    setBuckets(fetchedBuckets);
    setIsLoading(false);
  }

  useEffect(() => {
    refreshBuckets();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search buckets...">
      {buckets.map((bucket) => (
        <List.Item
          key={bucket.Name}
          title={bucket.Name}
          subtitle={bucket.Source}
          accessories={[{ text: `Manifests: ${bucket.Manifests}` }, { text: `Updated: ${bucket.Updated}` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={bucket.Source} />
              <Action
                title="Remove Bucket"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() =>
                  withToast(
                    async () => {
                      await scoopBucketRm(bucket.Name);
                      await refreshBuckets();
                    },
                    {
                      loading: `Removing bucket ${bucket.Name}...`,
                      success: `Bucket ${bucket.Name} removed.`,
                      failure: `Failed to remove bucket ${bucket.Name}.`,
                    },
                  )
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
