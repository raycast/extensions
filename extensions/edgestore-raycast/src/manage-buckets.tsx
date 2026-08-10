import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  deleteBucket,
  getAllBuckets,
  getLastUsedBucket,
  setLastUsedBucket,
  updateBucketTemporaryFlag,
} from "./lib/storage";
import { BucketConfig } from "./lib/types";

export default function Command() {
  const [buckets, setBuckets] = useState<BucketConfig[]>([]);
  const [lastUsedId, setLastUsedId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function refresh() {
    setIsLoading(true);
    const [all, last] = await Promise.all([getAllBuckets(), getLastUsedBucket()]);
    setBuckets(all);
    setLastUsedId(last?.bucketRefId);
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onSetLastUsed(bucketRefId: string) {
    await setLastUsedBucket(bucketRefId);
    await refresh();
    showToast({ title: "Selection updated" });
  }

  async function onDelete(bucket: BucketConfig) {
    const ok = await confirmAlert({
      title: "Remove bucket?",
      message: bucket.bucketName,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await deleteBucket(bucket.bucketRefId);
    await refresh();
    showToast({ title: "Bucket removed" });
  }

  async function onToggleTemporary(bucket: BucketConfig) {
    const newStatus = !bucket.temporaryFiles;
    await updateBucketTemporaryFlag(bucket.bucketRefId, newStatus);
    await refresh();
    showToast({ title: newStatus ? "Temporary files enabled" : "Temporary files disabled" });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search buckets...">
      {buckets.map((b) => {
        const accessories = [];
        if (lastUsedId === b.bucketRefId) {
          accessories.push({ text: "Last Used" });
        }
        if (b.temporaryFiles) {
          accessories.push({ tag: "Temporary" });
        }

        return (
          <List.Item
            key={b.bucketRefId}
            title={b.bucketName}
            accessories={accessories}
            actions={
              <ActionPanel>
                {lastUsedId !== b.bucketRefId ? (
                  <Action icon={Icon.Bolt} title="Mark as Last Used" onAction={() => onSetLastUsed(b.bucketRefId)} />
                ) : null}
                <Action
                  icon={b.temporaryFiles ? Icon.XMarkCircle : Icon.Clock}
                  title={b.temporaryFiles ? "Disable Temporary Files" : "Enable Temporary Files"}
                  onAction={() => onToggleTemporary(b)}
                />
                <Action
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  title="Remove Bucket"
                  onAction={() => onDelete(b)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
