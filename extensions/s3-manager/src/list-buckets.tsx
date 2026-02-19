import { ActionPanel, List, Action, Icon, showToast, Toast, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { S3Manager } from "./lib/s3-manager";
import { S3Cache } from "./lib/s3-cache";
import { S3ErrorHandler } from "./lib/error-handler";
import { ProfileManager } from "./lib/profile-manager";
import { S3Bucket, ConnectionProfile } from "./types";

export default function ListBuckets() {
  const [buckets, setBuckets] = useState<S3Bucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentProfile, setCurrentProfile] = useState<ConnectionProfile | null>(null);

  const s3Manager = new S3Manager();
  const s3Cache = new S3Cache();

  useEffect(() => {
    loadBuckets();
  }, []);

  async function loadBuckets() {
    try {
      setIsLoading(true);

      // Get default profile
      const defaultProfile = await ProfileManager.getDefaultProfile();

      if (!defaultProfile) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Profile Found",
          message: "Please configure an AWS profile first",
        });
        setIsLoading(false);
        return;
      }

      setCurrentProfile(defaultProfile);

      // Try to get cached buckets first
      // const cachedBuckets = await s3Cache.getCachedBuckets(defaultProfile.id);
      // if (cachedBuckets) {
      //   setBuckets(cachedBuckets);
      //   setIsLoading(false);
      //   return;
      // }

      // Load buckets from S3
      const bucketList = await s3Manager.listBuckets(defaultProfile.id);
      setBuckets(bucketList);

      // Cache the results
      await s3Cache.cacheBuckets(defaultProfile.id, bucketList);
    } catch (error) {
      const userError = S3ErrorHandler.handle(error as Error);
      await showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshBuckets() {
    if (currentProfile) {
      await s3Cache.clearCache(currentProfile.id);
      await loadBuckets();
    }
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  function navigateToBucket(bucket: S3Bucket) {
    // This would navigate to the browse-objects command
    console.log(`Navigate to bucket: ${bucket.name}`);
  }

  async function copyBucketName(bucketName: string) {
    await Clipboard.copy(bucketName);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied",
      message: `Bucket name "${bucketName}" copied to clipboard`,
    });
  }

  return (
    <List
      navigationTitle={currentProfile ? `S3 Browser - ${currentProfile.name}` : "S3 Browser"}
      searchBarPlaceholder="Search buckets..."
      isLoading={isLoading}
    >
      {buckets.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Cloud}
          title="No S3 Buckets"
          description={
            currentProfile
              ? `No buckets found in ${currentProfile.name}. Check your AWS credentials or create a bucket first.`
              : "No AWS profile configured. Please run 'aws configure' or manage profiles."
          }
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={refreshBuckets} />
              <Action title="Manage Profiles" onAction={() => console.log("Navigate to profiles")} />
            </ActionPanel>
          }
        />
      ) : (
        buckets.map((bucket) => (
          <List.Item
            key={bucket.name}
            title={bucket.name}
            subtitle={`${bucket.objectCount || 0} objects • ${bucket.region}`}
            accessories={[{ text: formatDate(bucket.creationDate) }, { icon: Icon.Cloud }]}
            actions={
              <ActionPanel>
                <Action title="Browse Objects" onAction={() => navigateToBucket(bucket)} icon={Icon.Folder} />
                <Action
                  title="Upload Files"
                  onAction={() => console.log(`Upload to ${bucket.name}`)}
                  icon={Icon.Upload}
                />
                <ActionPanel.Section title="Bucket Actions">
                  <Action title="Copy Bucket Name" onAction={() => copyBucketName(bucket.name)} icon={Icon.Clipboard} />
                  <Action title="Refresh" onAction={refreshBuckets} icon={Icon.ArrowClockwise} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
