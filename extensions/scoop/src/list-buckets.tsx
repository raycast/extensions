import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useScoop } from "./hooks/scoopHooks";
import { withToast } from "./utils";
import { ScoopBucket } from "./types/index.types";

export default function ListBucketsCommand() {
  const scoop = useScoop();
  const [buckets, setBuckets] = useState<ScoopBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshBuckets() {
    setIsLoading(true);
    const fetchedBuckets = await scoop.listBuckets();
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
                      await scoop.bucketRemove(bucket.Name);
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
