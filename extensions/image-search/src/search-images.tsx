import { useState, useEffect, useCallback } from "react";
import {
  ActionPanel,
  Action,
  Grid,
  Clipboard,
  Toast,
  showToast,
  closeMainWindow,
  getPreferenceValues,
} from "@raycast/api";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { showFailureToast } from "@raycast/utils";
import { fileTypeFromBuffer } from "file-type";

// Constants
const SEARCH_DEBOUNCE_MS = 500;
const MAX_RESULTS = 10;
const GRID_COLUMNS = 4;
const SUPPORTED_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff"] as const;

// Types
interface ImageResult {
  link: string;
  title: string;
  displayLink: string;
}

interface GoogleSearchResponse {
  items?: ImageResult[];
  error?: {
    message: string;
    code: number;
  };
}

interface Preferences {
  apiKey: string;
  cxId: string;
}

// Utility functions
const isValidImageExtension = (extension: string): extension is (typeof SUPPORTED_IMAGE_EXTENSIONS)[number] => {
  return SUPPORTED_IMAGE_EXTENSIONS.includes(extension as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number]);
};

const extractFileExtension = (url: string): string => {
  const fileName = url.split("/").pop() || "";
  return fileName.split(".").pop()?.toLowerCase() || "";
};

const createTempImageFile = async (buffer: Buffer, extension: string): Promise<string> => {
  const tempFileName = `${randomUUID()}.${extension}`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);
  await writeFile(tempFilePath, buffer);
  return tempFilePath;
};

const determineImageExtension = async (buffer: Buffer, originalExtension: string): Promise<string> => {
  if (originalExtension && isValidImageExtension(originalExtension)) {
    return originalExtension;
  }

  const fileType = await fileTypeFromBuffer(buffer);
  const detectedExtension = fileType?.ext;

  if (detectedExtension && isValidImageExtension(detectedExtension)) {
    return detectedExtension;
  }

  throw new Error("Unsupported image format");
};

// API functions
const buildSearchUrl = (apiKey: string, cxId: string, query: string): string => {
  const params = new URLSearchParams({
    key: apiKey,
    cx: cxId,
    q: query,
    searchType: "image",
    num: MAX_RESULTS.toString(),
  });

  return `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
};

const fetchSearchResults = async (apiKey: string, cxId: string, query: string): Promise<ImageResult[]> => {
  if (!query.trim()) {
    return [];
  }

  const url = buildSearchUrl(apiKey, cxId, query);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as GoogleSearchResponse;

  if (data.error) {
    throw new Error(`API Error: ${data.error.message}`);
  }

  return data.items || [];
};

const downloadImageBuffer = async (imageUrl: string): Promise<Buffer> => {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to download image: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

// Main component
export default function SearchImagesCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [images, setImages] = useState<ImageResult[]>([]);

  const { apiKey, cxId } = getPreferenceValues<Preferences>();

  const searchImages = useCallback(
    async (query: string) => {
      setIsLoading(true);

      try {
        const results = await fetchSearchResults(apiKey, cxId, query);
        setImages(results);
      } catch (error) {
        console.error("Error searching images:", error);
        await showFailureToast(error, { title: "Failed to search images" });
        setImages([]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, cxId],
  );

  const handleCopyImageToClipboard = useCallback(async (imageUrl: string) => {
    await showToast({
      title: "Copying image to clipboard...",
      style: Toast.Style.Animated,
    });

    try {
      const buffer = await downloadImageBuffer(imageUrl);
      const originalExtension = extractFileExtension(imageUrl);
      const extension = await determineImageExtension(buffer, originalExtension);
      const tempFilePath = await createTempImageFile(buffer, extension);

      await Clipboard.copy({ file: tempFilePath });
      closeMainWindow();

      await showToast({
        title: "Image copied to clipboard",
        style: Toast.Style.Success,
      });
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to copy image to clipboard",
      });
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      searchImages(searchText);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      setIsLoading(false);
    };
  }, [searchText, searchImages]);

  return (
    <Grid
      columns={GRID_COLUMNS}
      isLoading={isLoading}
      fit={Grid.Fit.Fill}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for images..."
    >
      <Grid.EmptyView title={searchText && !isLoading ? "No images found" : "Start typing to search for images"} />
      {images.map((image, index) => (
        <Grid.Item
          key={`${image.link}-${index}`}
          content={image.link}
          actions={
            <ActionPanel>
              <Action title="Copy Image to Clipboard" onAction={() => handleCopyImageToClipboard(image.link)} />
              <Action.CopyToClipboard content={image.link} title="Copy Image URL" />
              <Action.OpenInBrowser url={image.link} title="Open Image in Browser" />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
