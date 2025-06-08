import { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  Grid,
  Clipboard,
  Toast,
  showToast,
  closeMainWindow,
  showHUD,
  getPreferenceValues,
} from "@raycast/api";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

interface ImageResult {
  link: string;
  title: string;
  displayLink: string;
}

interface GoogleSearchResponse {
  items?: ImageResult[];
  error?: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [images, setImages] = useState<ImageResult[]>([]);

  const apiKey = getPreferenceValues<{ apiKey: string }>().apiKey;
  const cxId = getPreferenceValues<{ cxId: string }>().cxId;

  const searchImages = async (query: string) => {
    if (!query.trim()) {
      setImages([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cxId}&q=${encodeURIComponent(query)}&searchType=image&num=10`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as GoogleSearchResponse;

      if (data.error) {
        console.error("API Error:", data.error);
        await showToast({
          title: "Search failed",
          message: "API error occurred",
          style: Toast.Style.Failure,
        });
        setImages([]);
        return;
      }

      setImages(data.items || []);
    } catch (error) {
      console.error("Error searching images:", error);
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchImages(searchText);
    }, 500); // Debounce search by 500ms

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  return (
    <Grid
      columns={4}
      isLoading={isLoading}
      fit={Grid.Fit.Fill}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for images..."
    >
      {images.map((image, index) => (
        <Grid.Item
          key={image.link}
          content={image.link}
          actions={
            <ActionPanel>
              <Action
                title="Copy Image to Clipboard"
                onAction={async () => {
                  showToast({
                    title: "Copying image to clipboard...",
                    style: Toast.Style.Animated,
                  });
                  const data = await fetch(image.link);
                  const buffer = Buffer.from(await data.arrayBuffer());
                  // get temp directory
                  const tempDir = await os.tmpdir();
                  const tempFile = path.join(tempDir, randomUUID() + (image.link.split("/").pop() || ".png"));
                  await writeFile(tempFile, buffer);

                  try {
                    Clipboard.copy({
                      file: tempFile,
                    });

                    await showToast({
                      title: "Image copied to clipboard",
                      style: Toast.Style.Success,
                    });

                    await showHUD("Image copied to clipboard");

                    closeMainWindow();
                  } catch (error) {
                    console.error("Error copying image to clipboard:", error);

                    await showToast({
                      title: "Error copying image to clipboard",
                      style: Toast.Style.Failure,
                    });
                  }
                }}
              />
              <Action.CopyToClipboard content={image.link} title="Copy Image URL" />
              <Action.OpenInBrowser url={image.link} title="Open Image in Browser" />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
