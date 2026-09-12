import { Form, ActionPanel, Action, showToast, Toast, List, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";

interface DownloadLink {
  fileName: string;
  url: string;
  size?: string;
  type?: string;
}

interface AppMetadata {
  name?: string;
  version?: string;
  publisher?: string;
  productId: string;
}

// Dummy data for screenshots
const DUMMY_APP_METADATA: AppMetadata = {
  name: "15647 Neon Band. Explorerfor Files",
  productId: "9n0kwg910ldh",
  version: "1.219.24.0",
  publisher: "15647 Neon Band",
};

const DUMMY_DOWNLOAD_LINKS: DownloadLink[] = [
  {
    fileName: "15647NeonBand.ExplorerforFiles_1.219.24.0_x64_g3b9h1p9bdemw.appx",
    url: "https://example.com/download/1",
    size: "19.31 MB",
    type: "APPX",
  },
  {
    fileName: "15647NeonBand.ExplorerforFiles_1.219.24.0_x86_g3b9h1p9bdemw.appx",
    url: "https://example.com/download/2",
    size: "16.89 MB",
    type: "APPX",
  },
  {
    fileName: "15647NeonBand.ExplorerforFiles_1.246.168.0_x64_g3b9h1p9bdemw.appx",
    url: "https://example.com/download/3",
    size: "19.37 MB",
    type: "APPX",
  },
  {
    fileName: "15647NeonBand.ExplorerforFiles_1.246.168.0_x86_g3b9h1p9bdemw.appx",
    url: "https://example.com/download/4",
    size: "17.04 MB",
    type: "APPX",
  },
  {
    fileName: "15647NeonBand.ExplorerforFiles_1.385.96.0_x64_g3b9h1p9bdemw.msix",
    url: "https://example.com/download/5",
    size: "61.34 MB",
    type: "MSIX",
  },
  {
    fileName: "15647NeonBand.ExplorerforFiles_1.385.96.0_x86_g3b9h1p9bdemw.msix",
    url: "https://example.com/download/6",
    size: "57.36 MB",
    type: "MSIX",
  },
  {
    fileName: "15647NeonBand.ExplorerforFiles_1.387.28.0_x64_g3b9h1p9bdemw.msix",
    url: "https://example.com/download/7",
    size: "85.91 MB",
    type: "MSIX",
  },
  {
    fileName: "15647NeonBand.ExplorerforFiles_1.387.28.0_x86_g3b9h1p9bdemw.msix",
    url: "https://example.com/download/8",
    size: "80.12 MB",
    type: "MSIX",
  },
  {
    fileName: "15647NeonBand.ExplorerforFiles_1.400.0.0_x64_g3b9h1p9bdemw.msix",
    url: "https://example.com/download/9",
    size: "92.45 MB",
    type: "MSIX",
  },
  {
    fileName: "15647NeonBand.ExplorerforFiles_1.400.0.0_x86_g3b9h1p9bdemw.msix",
    url: "https://example.com/download/10",
    size: "88.23 MB",
    type: "MSIX",
  },
];

// Set to true to show dummy data for screenshots
const USE_DUMMY_DATA = false;

export default function Command() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Initialize with dummy data if enabled
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>(USE_DUMMY_DATA ? DUMMY_DOWNLOAD_LINKS : []);
  const [appMetadata, setAppMetadata] = useState<AppMetadata | null>(USE_DUMMY_DATA ? DUMMY_APP_METADATA : null);
  const [showResults, setShowResults] = useState(USE_DUMMY_DATA);

  function extractProductId(microsoftStoreUrl: string): string {
    // Extract product ID from various Microsoft Store URL formats
    const productIdMatch = microsoftStoreUrl.match(/([0-9][A-Z0-9]{11,13})/i);

    if (!productIdMatch) {
      throw new Error("Invalid Microsoft Store URL - could not find product ID");
    }

    return productIdMatch[1];
  }

  function parseFileSize(sizeText: string): string {
    // Convert size text to readable format
    const match = sizeText.match(/([\d.]+)\s*([KMGT]?B)/i);
    if (match) {
      const size = parseFloat(match[1]);
      const unit = match[2].toUpperCase();

      if (size >= 1024 && unit === "KB") {
        return `${(size / 1024).toFixed(2)} MB`;
      } else if (size >= 1024 && unit === "MB") {
        return `${(size / 1024).toFixed(2)} GB`;
      }
      return `${size.toFixed(2)} ${unit}`;
    }
    return sizeText;
  }

  function getFileType(fileName: string): string {
    if (fileName.includes(".appxbundle") || fileName.includes(".msixbundle")) {
      return "Bundle";
    } else if (fileName.includes(".appx")) {
      return "APPX";
    } else if (fileName.includes(".msix")) {
      return "MSIX";
    } else if (fileName.includes(".eappx")) {
      return "Encrypted APPX";
    } else if (fileName.includes(".emsix")) {
      return "Encrypted MSIX";
    }

    // Detect architecture
    if (fileName.includes("x64") || fileName.includes("_x64_")) {
      return "x64";
    } else if (fileName.includes("x86") || fileName.includes("_x86_")) {
      return "x86";
    } else if (fileName.includes("arm64") || fileName.includes("_arm64_")) {
      return "ARM64";
    } else if (fileName.includes("arm") || fileName.includes("_arm_")) {
      return "ARM";
    }

    return "Package";
  }

  async function fetchDownloadLinks(productId: string): Promise<{ links: DownloadLink[]; metadata: AppMetadata }> {
    const formData = new URLSearchParams();
    formData.append("type", "ProductId");
    formData.append("url", productId);
    formData.append("ring", "Retail");
    formData.append("lang", "en-US");

    const response = await fetch("https://store.rg-adguard.net/api/GetFiles", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract app metadata from HTML
    const metadata: AppMetadata = {
      productId: productId,
    };

    // Try to extract app name from title or headers
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1] && !titleMatch[1].includes("GetFiles")) {
      metadata.name = titleMatch[1].trim();
    }

    // Try to extract from h1 or other headers
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      metadata.name = h1Match[1].trim();
    }

    // Parse the HTML response to extract download links with sizes
    const links: DownloadLink[] = [];

    // Match table rows with links and file sizes
    const tableRowRegex = /<tr[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<\/tr>/gi;
    let match;

    while ((match = tableRowRegex.exec(html)) !== null) {
      const url = match[1];
      const fileName = match[2].trim();

      // Only include actual download links
      if (url.includes("tlu.dl.delivery.mp.microsoft.com") || url.includes(".windowsupdate.com")) {
        // Extract file size from the same row
        const rowHtml = match[0];
        const sizeMatch = rowHtml.match(/>(\d+\.?\d*\s*[KMGT]?B)</i);

        let size = undefined;
        if (sizeMatch && sizeMatch[1]) {
          size = parseFileSize(sizeMatch[1]);
        }

        // Try to extract version from filename
        const versionMatch = fileName.match(/_([\d.]+)_/);
        if (versionMatch && !metadata.version) {
          metadata.version = versionMatch[1];
        }

        links.push({
          fileName,
          url,
          size,
          type: getFileType(fileName),
        });
      }
    }

    // Fallback: if metadata parsing failed, try simpler regex patterns
    if (!metadata.name) {
      // Try to get name from the first filename (usually contains app name)
      if (links.length > 0) {
        const firstFile = links[0].fileName;
        const nameMatch = firstFile.match(/^([^_]+)/);
        if (nameMatch) {
          metadata.name = nameMatch[1].replace(/([A-Z])/g, " $1").trim();
        }
      }
    }

    return { links, metadata };
  }

  // Ensure dummy data loads on mount if enabled
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
      // Use dummy data if enabled
      if (USE_DUMMY_DATA) {
        // Simulate a brief delay for realism
        await new Promise((resolve) => setTimeout(resolve, 500));

        setDownloadLinks(DUMMY_DOWNLOAD_LINKS);
        setAppMetadata(DUMMY_APP_METADATA);
        setShowResults(true);

        await showToast({
          style: Toast.Style.Success,
          title: "Downloads Found",
          message: `Found ${DUMMY_DOWNLOAD_LINKS.length} download(s)`,
        });
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

  if (showResults && downloadLinks.length > 0) {
    return (
      <List navigationTitle={appMetadata?.name || "Downloads"} searchBarPlaceholder="Search downloads...">
        {appMetadata && (
          <List.Section title="App Information">
            <List.Item
              icon={Icon.Info}
              title={appMetadata.name || "Unknown App"}
              subtitle={`Product ID: ${appMetadata.productId}`}
              accessories={[
                appMetadata.version ? { text: `v${appMetadata.version}` } : {},
                appMetadata.publisher ? { text: appMetadata.publisher } : {},
              ].filter((acc) => Object.keys(acc).length > 0)}
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
              accessories={[link.size ? { text: link.size, icon: Icon.HardDrive } : {}].filter(
                (acc) => Object.keys(acc).length > 0,
              )}
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
      />
      <Form.Description text="Paste a Microsoft Store URL or product ID to get direct download links via rg-adguard.net" />
    </Form>
  );
}
