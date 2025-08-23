import { showToast, Toast, Clipboard, LocalStorage, List, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAllProviders, CloudProviderType } from "./cloudProviders";
import { uploadToS3, getPublicS3Url, MAX_PRESIGN_EXPIRY } from "./uploaders/s3Uploader";
import { uploadToBunny, getPublicBunnyUrl } from "./uploaders/bunnyUploader";
import { truncateFileName, getFileIcon } from "./utils/fileUtils";

// Utility to convert file:// URI to local file path
function fileUriToPath(fileUri: string): string {
  if (fileUri.startsWith("file://")) {
    return decodeURIComponent(fileUri.replace("file://", ""));
  }
  return fileUri;
}

export default function Command() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedLink, setUploadedLink] = useState<{
    file: string;
    url: string;
    uploadedAt: number;
    type: "public" | "presigned";
    expiry?: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      setIsUploading(true);
      const providers = await getAllProviders();
      const currentProvider = providers.find((p) => p.isDefault) || providers[0] || null;
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
      let url = "";
      let type: "public" | "presigned" = "public";
      let expiryValue: number | undefined = undefined;
      try {
        if (currentProvider.providerType === CloudProviderType.S3) {
          if (currentProvider.accessLevel === "public") {
            await uploadToS3(currentProvider, filePath, currentProvider.defaultPath, 0);
            url = getPublicS3Url(currentProvider, filePath);
            type = "public";
          } else {
            type = "presigned";
            expiryValue = MAX_PRESIGN_EXPIRY;
            url = await uploadToS3(currentProvider, filePath, currentProvider.defaultPath, expiryValue);
          }
        } else if (currentProvider.providerType === CloudProviderType.BunnyCDN) {
          await uploadToBunny(currentProvider, filePath, currentProvider.defaultPath);
          url = getPublicBunnyUrl(currentProvider, filePath);
          type = currentProvider.accessLevel === "public" ? "public" : "presigned";
        } else {
          throw new Error("Unsupported provider type");
        }
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
      const link = {
        file: filePath.split("/").pop() || filePath,
        url,
        uploadedAt: Date.now(),
        type,
        expiry: expiryValue,
      };
      setUploadedLink(link);
      // Save to recent uploads
      const prev = (await LocalStorage.getItem<string>("recentUploads")) || "[]";
      let prevArr: { file: string; url: string; uploadedAt: number; type?: "public" | "presigned"; expiry?: number }[] =
        [];
      try {
        prevArr = JSON.parse(prev);
      } catch {
        // Ignore JSON parse errors and use empty array
      }
      const merged = [link, ...prevArr].slice(0, 50);
      await LocalStorage.setItem("recentUploads", JSON.stringify(merged));
      await Clipboard.copy(url);
      await showToast({ style: Toast.Style.Success, title: "Link copied to clipboard", message: url });
      setIsUploading(false);
    })();
  }, []);

  if (isUploading) {
    return <List isLoading navigationTitle="Uploading from Clipboard..." />;
  }
  if (uploadedLink) {
    return <UploadedLinksScreen links={[uploadedLink]} />;
  }
  return <List navigationTitle="Upload from Clipboard" />;
}

function UploadedLinksScreen({
  links,
}: {
  links: { file: string; url: string; uploadedAt: number; type: "public" | "presigned"; expiry?: number }[];
}) {
  return (
    <List navigationTitle="Uploaded File Link" isShowingDetail>
      {links.map((link) => (
        <UploadedFileListItem key={link.url} link={link} />
      ))}
    </List>
  );
}

function UploadedFileListItem({
  link,
}: {
  link: { file: string; url: string; uploadedAt: number; type?: "public" | "presigned"; expiry?: number };
}) {
  return (
    <List.Item
      key={link.url}
      title={truncateFileName(link.file)}
      subtitle={link.url}
      icon={getFileIcon(link.file, link.url)}
      accessories={[
        link.type === "presigned"
          ? { tag: `Expires in ${link.expiry ? Math.round(link.expiry / 3600) + "h" : "?"}` }
          : { tag: link.type === "public" ? "Public" : "Private" },
        { date: new Date(link.uploadedAt), tooltip: new Date(link.uploadedAt).toLocaleString() },
      ]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="File Name" text={link.file} />
              <List.Item.Detail.Metadata.Link title="Link" target={link.url} text={link.url} />
              <List.Item.Detail.Metadata.Label title="Uploaded" text={new Date(link.uploadedAt).toLocaleString()} />
              {link.type === "presigned" && (
                <List.Item.Detail.Metadata.Label
                  title="Expiry"
                  text={link.expiry ? `${Math.round(link.expiry / 3600)}h` : "?"}
                />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={link.url} />
          <Action.OpenInBrowser url={link.url} />
        </ActionPanel>
      }
    />
  );
}
