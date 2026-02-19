import { ActionPanel, List, Action, Icon, showToast, Toast, Clipboard, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { S3Manager } from "./lib/s3-manager";
import { S3Cache } from "./lib/s3-cache";
import { S3ErrorHandler } from "./lib/error-handler";
import { ProfileManager } from "./lib/profile-manager";
import { S3Object, ConnectionProfile } from "./types";

interface BrowseObjectsProps {
  bucket?: string;
  prefix?: string;
}

export default function BrowseObjects({ bucket = "example-bucket-1", prefix = "" }: BrowseObjectsProps) {
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBucket] = useState(bucket);
  const [currentPrefix] = useState(prefix);
  const [currentProfile, setCurrentProfile] = useState<ConnectionProfile | null>(null);

  const s3Manager = new S3Manager();
  const s3Cache = new S3Cache();

  useEffect(() => {
    loadObjects();
  }, [currentBucket, currentPrefix]);

  async function loadObjects() {
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

      // Try to get cached objects first
      const cachedObjects = await s3Cache.getCachedBucketListing(defaultProfile.id, currentBucket);
      if (cachedObjects) {
        setObjects(cachedObjects.filter((obj) => obj.key.startsWith(currentPrefix)));
        setIsLoading(false);
        return;
      }

      // Load objects from S3
      const objectList = await s3Manager.listObjects(defaultProfile.id, currentBucket, currentPrefix);
      setObjects(objectList);

      // Cache the results
      await s3Cache.cacheBucketListing(defaultProfile.id, currentBucket, objectList);
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

  async function refreshObjects() {
    if (currentProfile) {
      await s3Cache.clearCache(currentProfile.id);
      await loadObjects();
    }
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  function formatFileSize(bytes: number): string {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }

  function getObjectDisplayName(key: string): string {
    // Remove the current prefix from the display name
    const displayKey = key.startsWith(currentPrefix) ? key.substring(currentPrefix.length) : key;
    return displayKey || key;
  }

  function getFileIcon(contentType?: string): Icon {
    if (!contentType) return Icon.Document;

    if (contentType.startsWith("image/")) return Icon.Image;
    if (contentType.startsWith("video/")) return Icon.Video;
    if (contentType.startsWith("audio/")) return Icon.Music;
    if (contentType.includes("pdf")) return Icon.Document;
    if (contentType.includes("text/")) return Icon.TextDocument;
    if (contentType.includes("json") || contentType.includes("xml")) return Icon.Code;

    return Icon.Document;
  }

  function navigateToFolder(object: S3Object) {
    // In a real implementation, this would update the current prefix and reload
    console.log(`Navigate to folder: ${object.key}`);
  }

  async function downloadObject(object: S3Object) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting Download",
        message: `Downloading ${object.key}...`,
      });

      if (currentProfile) {
        // Mock download - in real implementation would download to user's Downloads folder
        await s3Manager.downloadFile(
          currentProfile.id,
          currentBucket,
          object.key,
          `/Downloads/${getObjectDisplayName(object.key)}`,
        );

        await showHUD("Download completed");
      }
    } catch (error) {
      const userError = S3ErrorHandler.handle(error as Error);
      await showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.message,
      });
    }
  }

  async function copyPublicUrl(object: S3Object) {
    const url = `https://${currentBucket}.s3.amazonaws.com/${object.key}`;
    await Clipboard.copy(url);
    await showHUD("Public URL copied to clipboard");
  }

  async function generatePresignedUrl(object: S3Object) {
    try {
      if (currentProfile) {
        const presignedUrl = await s3Manager.generatePresignedUrl(currentProfile.id, currentBucket, object.key, 3600);
        await Clipboard.copy(presignedUrl);
        await showHUD("Presigned URL copied to clipboard (expires in 1 hour)");
      }
    } catch (error) {
      const userError = S3ErrorHandler.handle(error as Error);
      await showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.message,
      });
    }
  }

  async function deleteObject(object: S3Object) {
    try {
      if (currentProfile) {
        await s3Manager.deleteObject(currentProfile.id, currentBucket, object.key);

        // Remove from local state
        setObjects(objects.filter((obj) => obj.key !== object.key));

        await showHUD("Object deleted successfully");
      }
    } catch (error) {
      const userError = S3ErrorHandler.handle(error as Error);
      await showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.message,
      });
    }
  }

  async function copyObjectKey(key: string) {
    await Clipboard.copy(key);
    await showHUD("Object key copied to clipboard");
  }

  const navigationTitle = currentPrefix ? `${currentBucket} / ${currentPrefix}` : currentBucket;

  return (
    <List navigationTitle={navigationTitle} searchBarPlaceholder="Search objects..." isLoading={isLoading}>
      {objects.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Objects Found"
          description="This bucket or folder appears to be empty."
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={refreshObjects} />
              <Action title="Upload Files" onAction={() => console.log("Navigate to upload")} />
            </ActionPanel>
          }
        />
      ) : (
        objects.map((object) => (
          <List.Item
            key={object.key}
            title={getObjectDisplayName(object.key)}
            subtitle={object.isFolder ? "Folder" : formatFileSize(object.size)}
            accessories={[
              { text: formatDate(object.lastModified) },
              { icon: object.isFolder ? Icon.Folder : getFileIcon(object.contentType) },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={object.isFolder ? "Open Folder" : "Download"}
                  onAction={() => (object.isFolder ? navigateToFolder(object) : downloadObject(object))}
                  icon={object.isFolder ? Icon.Folder : Icon.Download}
                />
                {!object.isFolder && (
                  <>
                    <Action title="Copy Public URL" onAction={() => copyPublicUrl(object)} icon={Icon.Link} />
                    <Action
                      title="Generate Presigned URL"
                      onAction={() => generatePresignedUrl(object)}
                      icon={Icon.Clock}
                    />
                  </>
                )}
                <ActionPanel.Section title="Object Actions">
                  <Action title="Copy Object Key" onAction={() => copyObjectKey(object.key)} icon={Icon.Clipboard} />
                  <Action title="Refresh" onAction={refreshObjects} icon={Icon.ArrowClockwise} />
                  <Action
                    title="Delete"
                    style={Action.Style.Destructive}
                    onAction={() => deleteObject(object)}
                    icon={Icon.Trash}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
