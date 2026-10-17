import { Form, ActionPanel, Action, showToast, Toast, List, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";

import { USE_DUMMY_DATA } from "./constants";
import { DUMMY_APP_METADATA, DUMMY_DOWNLOAD_LINKS } from "./dummy-data";
import { AppMetadata, DownloadLink } from "./types";
import { extractProductId, fetchDownloadLinks } from "./utils";

export default function Command() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([]);
  const [appMetadata, setAppMetadata] = useState<AppMetadata | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Initialize with dummy data if enabled
  useEffect(() => {
    if (USE_DUMMY_DATA) {
      setDownloadLinks(DUMMY_DOWNLOAD_LINKS);
      setAppMetadata(DUMMY_APP_METADATA);
      setShowResults(true);
    }
  }, []);

  async function handleSubmit(values: { url: string }) {
    setIsLoading(true);

    try {
      if (USE_DUMMY_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setDownloadLinks(DUMMY_DOWNLOAD_LINKS);
        setAppMetadata(DUMMY_APP_METADATA);
        setShowResults(true);
        setIsLoading(false);
        return;
      }

      const productId = extractProductId(values.url);

      await showToast({
        style: Toast.Style.Animated,
        title: "Fetching Downloads",
        message: "Please wait...",
      });

      const { links, metadata } = await fetchDownloadLinks(productId);

      if (links.length === 0) {
        await showFailureToast({
          title: "No Downloads Found",
          message: "No download links were found for this product",
        });
        setIsLoading(false);
        return;
      }

      setDownloadLinks(links);
      setAppMetadata(metadata);
      setShowResults(true);

      await showToast({
        style: Toast.Style.Success,
        title: "Downloads Found",
        message: `Found ${links.length} download(s)`,
      });
    } catch (error) {
      await showFailureToast(error, {
        title: "Fetch Failed",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Render Results List
  if (showResults && downloadLinks.length > 0) {
    return (
      <List navigationTitle={appMetadata?.name || "Downloads"} searchBarPlaceholder="Search downloads...">
        {appMetadata && (
          <List.Section title="App Information">
            <List.Item
              icon={Icon.Info}
              title={appMetadata.name || "Unknown App"}
              subtitle={`Product ID: ${appMetadata.productId}`}
              accessories={
                [
                  appMetadata.version ? { text: `v${appMetadata.version}` } : null,
                  appMetadata.publisher ? { text: appMetadata.publisher } : null,
                ].filter(Boolean) as List.Item.Accessory[]
              }
            />
          </List.Section>
        )}

        <List.Section title={`Available Downloads (${downloadLinks.length})`}>
          {downloadLinks.map((link) => (
            <List.Item
              key={link.url}
              icon={Icon.Download}
              title={link.fileName}
              subtitle={link.type}
              accessories={
                [link.size ? { text: link.size, icon: Icon.HardDrive } : null].filter(Boolean) as List.Item.Accessory[]
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={link.url} title="Download" />
                  <Action.CopyToClipboard
                    content={link.url}
                    title="Copy URL"
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    content={link.fileName}
                    title="Copy Filename"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Back to Input"
                    onAction={() => setShowResults(false)}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }

  // Render Search Form
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Download Links" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Microsoft Store URL or Product ID"
        placeholder="https://apps.microsoft.com/detail/9n0kwg910ldh or 9n0kwg910ldh"
        value={url}
        onChange={setUrl}
        autoFocus
      />
      <Form.Description text="Paste a Microsoft Store URL or product ID to get direct download links via rg-adguard.net" />
    </Form>
  );
}
