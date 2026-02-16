import { showToast, Toast, Clipboard, List, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAllProviders, CloudProviderAccount } from "./cloudProviders";
import { uploadSingleFile } from "./utils/uploadHelpers";
import { saveRecentUploads, type RecentUpload } from "./utils/recentUploads";
import { UploadedLinksScreen } from "./uploaded-links-view";

// Utility to convert file:// URI to local file path
function fileUriToPath(fileUri: string): string {
  if (fileUri.startsWith("file://")) {
    return decodeURIComponent(fileUri.replace("file://", ""));
  }
  return fileUri;
}

export default function Command() {
  const [isUploading, setIsUploading] = useState(false);
  const [providers, setProviders] = useState<CloudProviderAccount[]>([]);
  const [uploadedLink, setUploadedLink] = useState<RecentUpload | null>(null);

  useEffect(() => {
    (async () => {
      const allProviders = await getAllProviders();
      setProviders(allProviders);

      if (allProviders.length === 0) {
        setIsUploading(false);
        return;
      }

      setIsUploading(true);
      const currentProvider = allProviders.find((p) => p.isDefault) || allProviders[0] || null;
      if (!currentProvider) {
        await showToast({ style: Toast.Style.Failure, title: "No provider configured" });
        setIsUploading(false);
        return;
      }
      const { file } = await Clipboard.read();
      if (!file) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No file or image in clipboard",
          message: "Copy a file or image to the clipboard first.",
        });
        setIsUploading(false);
        return;
      }
      const filePath = fileUriToPath(file);
      try {
        const link = await uploadSingleFile(currentProvider, filePath);
        setUploadedLink(link);
        await saveRecentUploads([link]);
        await Clipboard.copy(link.url);
        await showToast({ style: Toast.Style.Success, title: "Link copied to clipboard", message: link.url });
        setIsUploading(false);
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Upload failed",
          message:
            typeof err === "object" &&
            err !== null &&
            "message" in err &&
            typeof (err as { message?: unknown }).message === "string"
              ? (err as { message: string }).message
              : String(err),
        });
        setIsUploading(false);
        return;
      }
    })();
  }, []);

  // Show empty state if no providers are configured
  if (providers.length === 0) {
    return (
      <List navigationTitle="Upload from Clipboard">
        <List.EmptyView
          title="No Cloud Providers Configured"
          description="You need to add at least one cloud storage provider before you can upload from clipboard."
          actions={
            <ActionPanel>
              <Action.Open
                title="Manage Cloud Providers"
                target="raycast://extensions/scisaif/uploaderx/manage-cloud-providers"
                icon="⚙️"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (isUploading) {
    return <List isLoading navigationTitle="Uploading from Clipboard..." />;
  }
  if (uploadedLink) {
    return <UploadedLinksScreen navigationTitle="Uploaded File Link" links={[uploadedLink]} />;
  }
  return <List navigationTitle="Upload from Clipboard" />;
}

// UploadedLinksScreen and UploadedFileListItem are now shared via ./uploaded-links-view
