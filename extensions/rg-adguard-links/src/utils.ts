import { API_URL, REGEX } from "./constants";
import { AppMetadata, DownloadLink, FetchResult } from "./types";

/**
 * Extracts the product ID from a Microsoft Store URL or validates a raw ID.
 */
export function extractProductId(input: string): string {
  const match = input.match(REGEX.PRODUCT_ID);
  if (!match) {
    throw new Error("Invalid Microsoft Store URL - could not find product ID");
  }
  return match[1];
}

/**
 * Normalizes file size strings (e.g., converts huge KB values to MB/GB).
 */
export function parseFileSize(sizeText: string): string {
  const match = sizeText.match(REGEX.SIZE_TEXT);
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

/**
 * Determines file type and architecture based on filename.
 */
export function getFileType(fileName: string): string {
  let type = "Package";

  if (fileName.includes(".appxbundle") || fileName.includes(".msixbundle")) {
    type = "Bundle";
  } else if (fileName.includes(".appx")) {
    type = "APPX";
  } else if (fileName.includes(".msix")) {
    type = "MSIX";
  } else if (fileName.includes(".eappx")) {
    type = "Encrypted APPX";
  } else if (fileName.includes(".emsix")) {
    type = "Encrypted MSIX";
  }

  // Detect architecture
  if (fileName.includes("x64") || fileName.includes("_x64_")) {
    return `${type} (x64)`;
  } else if (fileName.includes("x86") || fileName.includes("_x86_")) {
    return `${type} (x86)`;
  } else if (fileName.includes("arm64") || fileName.includes("_arm64_")) {
    return `${type} (ARM64)`;
  } else if (fileName.includes("arm") || fileName.includes("_arm_")) {
    return `${type} (ARM)`;
  }

  return type;
}

/**
 * Fetches HTML from RG-Adguard and parses it for download links.
 */
export async function fetchDownloadLinks(productId: string): Promise<FetchResult> {
  const formData = new URLSearchParams();
  formData.append("type", "ProductId");
  formData.append("url", productId);
  formData.append("ring", "Retail");
  formData.append("lang", "en-US");

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const html = await response.text();

  const metadata: AppMetadata = { productId };

  // 1. Extract Name
  const titleMatch = html.match(REGEX.TITLE_TAG);
  if (titleMatch && titleMatch[1] && !titleMatch[1].includes("GetFiles")) {
    metadata.name = titleMatch[1].trim();
  } else {
    const h1Match = html.match(REGEX.H1_TAG);
    if (h1Match && h1Match[1]) {
      metadata.name = h1Match[1].trim();
    }
  }

  // 2. Parse Table Rows
  const links: DownloadLink[] = [];
  let match;

  // Reset lastIndex because we are using global flag regex in a loop
  REGEX.TABLE_ROW.lastIndex = 0;

  while ((match = REGEX.TABLE_ROW.exec(html)) !== null) {
    const url = match[1];
    const fileName = match[2].trim();

    // Filter for actual download links
    if (url.includes("tlu.dl.delivery.mp.microsoft.com") || url.includes(".windowsupdate.com")) {
      const rowHtml = match[0];
      const sizeMatch = rowHtml.match(REGEX.SIZE_IN_ROW);

      let size: string | undefined = undefined;
      if (sizeMatch && sizeMatch[1]) {
        size = parseFileSize(sizeMatch[1]);
      }

      // Try to extract version from filename if not yet found
      const versionMatch = fileName.match(REGEX.VERSION_FROM_FILENAME);
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

  // Fallback name extraction
  if (!metadata.name && links.length > 0) {
    const firstFile = links[0].fileName;
    const nameMatch = firstFile.match(/^([^_]+)/);
    if (nameMatch) {
      metadata.name = nameMatch[1].replace(/([A-Z])/g, " $1").trim();
    }
  }

  return { links, metadata };
}
