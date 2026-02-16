import { Action, ActionPanel, Form, showToast, Toast, Clipboard, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { CloudProviderAccount, CloudProviderType, getAllProviders } from "./cloudProviders";
import { MAX_PRESIGN_EXPIRY } from "./uploaders/s3Uploader";
import { saveRecentUploads, type RecentUpload } from "./utils/recentUploads";
import { uploadSingleFile } from "./utils/uploadHelpers";
import { UploadedLinksScreen } from "./uploaded-links-view";

const PRESIGNED_EXPIRY_OPTIONS = [
  { label: "1 Hour", value: 60 * 60 },
  { label: "1 Day", value: 60 * 60 * 24 },
  { label: "6 Days (Max)", value: 60 * 60 * 24 * 6 },
];

export default function Command() {
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedLinks, setUploadedLinks] = useState<RecentUpload[] | null>(null);
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
    const links: RecentUpload[] = [];
    try {
      for (const filePath of filePaths) {
        try {
          const link = await uploadSingleFile(currentProvider, filePath, {
            expiry:
              currentProvider.providerType === CloudProviderType.S3 && currentProvider.accessLevel === "private"
                ? Math.min(expiry, MAX_PRESIGN_EXPIRY)
                : undefined,
          });
          links.push(link);
        } catch (err: unknown) {
          await showFailureToast(err, { title: `Upload failed: ${filePath.split("/").pop()}` });
          continue;
        }
      }
      setUploadedLinks(links);
      // Save to recent uploads
      await saveRecentUploads(links);
      if (links.length === 1) {
        await Clipboard.copy(links[0].url);
        await showToast({ style: Toast.Style.Success, title: "Link copied to clipboard", message: links[0].url });
      } else if (links.length > 1) {
        await showToast({ style: Toast.Style.Success, title: "All files uploaded", message: "See links below." });
      }
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Upload failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
    setIsUploading(false);
  }

  if (uploadedLinks) {
    return <UploadedLinksScreen navigationTitle="Uploaded File Links" links={uploadedLinks} />;
  }

  // Show empty state if no providers are configured
  if (providers.length === 0) {
    return (
      <List navigationTitle="Upload Files">
        <List.EmptyView
          title="No Cloud Providers Configured"
          description="You need to add at least one cloud storage provider before you can upload files."
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

// UploadedLinksScreen is now shared via ./uploaded-links-view
