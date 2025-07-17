import { Action, ActionPanel, Form, showToast, Toast, Clipboard, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { CloudProviderAccount, CloudProviderType, getAllProviders } from "./cloudProviders";
import { uploadToS3, getPublicS3Url, MAX_PRESIGN_EXPIRY } from "./uploaders/s3Uploader";
import { uploadToBunny, getPublicBunnyUrl } from "./uploaders/bunnyUploader";
import { LocalStorage } from "@raycast/api";
import { truncateFileName, getFileIcon } from "./utils/fileUtils";

const PRESIGNED_EXPIRY_OPTIONS = [
  { label: "1 Hour", value: 60 * 60 },
  { label: "1 Day", value: 60 * 60 * 24 },
  { label: "6 Days (Max)", value: 60 * 60 * 24 * 6 },
];

export default function Command() {
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedLinks, setUploadedLinks] = useState<
    { file: string; url: string; uploadedAt: number; type: "public" | "presigned"; expiry?: number }[] | null
  >(null);
  const [expiry, setExpiry] = useState<number>(PRESIGNED_EXPIRY_OPTIONS[2].value); // default: 6 days
  const [providers, setProviders] = useState<CloudProviderAccount[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<CloudProviderAccount | null>(null);

  useEffect(() => {
    (async () => {
      const all = await getAllProviders();
      setProviders(all);
      const def = all.find((p) => p.isDefault) || all[0] || null;
      setSelectedProviderId(def?.id || null);
      setSelectedProvider(def || null);
    })();
  }, []);

  useEffect(() => {
    if (!providers.length) return;
    const p = providers.find((p) => p.id === selectedProviderId) || null;
    setSelectedProvider(p);
  }, [selectedProviderId, providers]);

  async function handleSubmit() {
    setIsUploading(true);
    const currentProvider = selectedProvider;
    if (!currentProvider) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No provider selected",
        message: "Please select a provider.",
      });
      setIsUploading(false);
      return;
    }
    if (filePaths.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No files selected" });
      setIsUploading(false);
      return;
    }
    const links: { file: string; url: string; uploadedAt: number; type: "public" | "presigned"; expiry?: number }[] =
      [];
    try {
      for (const filePath of filePaths) {
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
              expiryValue = Math.min(expiry, MAX_PRESIGN_EXPIRY);
              url = await uploadToS3(currentProvider, filePath, currentProvider.defaultPath, expiryValue);
            }
          } else if (currentProvider.providerType === CloudProviderType.BunnyCDN) {
            await uploadToBunny(currentProvider, filePath, currentProvider.defaultPath);
            url = getPublicBunnyUrl(currentProvider, filePath);
            type = currentProvider.accessLevel === "public" ? "public" : "presigned";
          } else {
            throw new Error("Unsupported provider type");
          }
        } catch (err: unknown) {
          console.error("Upload failed for file:", filePath, err);
          await showToast({
            style: Toast.Style.Failure,
            title: `Upload failed: ${filePath.split("/").pop()}`,
            message:
              typeof err === "object" &&
              err !== null &&
              "message" in err &&
              typeof (err as { message?: unknown }).message === "string"
                ? (err as { message: string }).message
                : String(err),
          });
          continue;
        }
        links.push({ file: filePath.split("/").pop() || "", url, uploadedAt: Date.now(), type, expiry: expiryValue });
      }
      setUploadedLinks(links);
      // Save to recent uploads
      const prev = (await LocalStorage.getItem<string>("recentUploads")) || "[]";
      let prevArr: { file: string; url: string; uploadedAt: number; type?: "public" | "presigned"; expiry?: number }[] =
        [];
      try {
        prevArr = JSON.parse(prev);
      } catch {
        // Ignore JSON parse errors and use empty array
      }
      const merged = [...links, ...prevArr].slice(0, 50); // keep max 50
      await LocalStorage.setItem("recentUploads", JSON.stringify(merged));
      if (links.length === 1) {
        await Clipboard.copy(links[0].url);
        await showToast({ style: Toast.Style.Success, title: "Link copied to clipboard", message: links[0].url });
      } else if (links.length > 1) {
        await showToast({ style: Toast.Style.Success, title: "All files uploaded", message: "See links below." });
      }
    } catch (e) {
      console.error("General upload error:", e);
      await showToast({
        style: Toast.Style.Failure,
        title: "Upload failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
    setIsUploading(false);
  }

  if (uploadedLinks) {
    return <UploadedLinksScreen links={uploadedLinks} />;
  }

  return (
    <Form
      navigationTitle="Upload Files"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isUploading}
    >
      <Form.FilePicker
        id="files"
        title="Select Files"
        allowMultipleSelection
        value={filePaths}
        onChange={setFilePaths}
        autoFocus
      />
      <Form.Dropdown
        id="provider"
        title="Cloud Provider"
        value={selectedProviderId || undefined}
        onChange={setSelectedProviderId}
        info="Choose which provider to upload to."
      >
        {providers.map((p) => (
          <Form.Dropdown.Item key={p.id} value={p.id} title={p.displayName} />
        ))}
      </Form.Dropdown>
      {selectedProvider?.providerType === CloudProviderType.S3 && selectedProvider?.accessLevel === "private" && (
        <Form.Dropdown
          id="expiry"
          title="Presigned Link Expiry"
          value={String(expiry)}
          onChange={(v) => setExpiry(Number(v))}
          info="How long the shareable link will work. Max: 6 days."
          storeValue={false}
        >
          {PRESIGNED_EXPIRY_OPTIONS.map((opt) => (
            <Form.Dropdown.Item key={opt.value} value={String(opt.value)} title={opt.label} />
          ))}
        </Form.Dropdown>
      )}
      {isUploading && <Form.Description title=" " text="⏳ Uploading..." />}
    </Form>
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

function UploadedLinksScreen({
  links,
}: {
  links: { file: string; url: string; uploadedAt: number; type: "public" | "presigned"; expiry?: number }[];
}) {
  return (
    <List navigationTitle="Uploaded File Links" isShowingDetail>
      {links.map((link) => (
        <UploadedFileListItem key={link.url} link={link} />
      ))}
    </List>
  );
}
