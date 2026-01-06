import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  getPreferenceValues,
  getSelectedFinderItems,
  Grid,
  Keyboard,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";
// Max 10MB to account for base64 encoding overhead (~33% increase = ~13MB final size)
const MAX_FILE_SIZE_MB = 10;

// Check file size and return base64 data URL, or throw error if too large
function prepareImage(filePath: string): string {
  console.log("[DEBUG] prepareImage called with:", filePath);
  const stats = fs.statSync(filePath);
  console.log("[DEBUG] File stats:", { size: stats.size, sizeMB: (stats.size / 1024 / 1024).toFixed(2) });
  const ext = path.extname(filePath).slice(1).toLowerCase();

  // Reject images over 15MB
  if (stats.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    console.log("[DEBUG] File too large, throwing error");
    throw new Error(`Your file is (${sizeMB} MB). Please reduce it to ${MAX_FILE_SIZE_MB} MB or less.`);
  }

  console.log("[DEBUG] Reading file...");
  const imageData = fs.readFileSync(filePath);
  console.log("[DEBUG] File read, converting to base64...");
  const base64 = imageData.toString("base64");
  console.log("[DEBUG] Base64 length:", base64.length);
  return `data:image/${ext};base64,${base64}`;
}

// Helper function to copy processed image to clipboard
async function copyProcessedImage(imageUrl: string): Promise<void> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  const mimeType = response.headers.get("content-type") || "image/png";
  const dataURL = `data:${mimeType};base64,${base64}`;
  await Clipboard.copy(dataURL);
}

interface ReplicatePrediction {
  id: string;
  status: string;
  output?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  useEffect(() => {
    async function loadSelectedFile() {
      try {
        const selectedItems = await getSelectedFinderItems();
        if (selectedItems.length === 0) {
          return; // No toast, will show Form
        }
        const file = selectedItems[0];
        if (!file.path.match(/\.(png|jpg|jpeg)$/i)) {
          showToast({
            style: Toast.Style.Failure,
            title: "Invalid file type",
            message: "Please select a PNG or JPG image.",
          });
          return;
        }
        const dataURL = prepareImage(file.path);
        setOriginalImage(dataURL);
        processImage(dataURL);
      } catch (error) {
        console.log("[DEBUG] Caught error in loadSelectedFile:", error);
        const message = error instanceof Error ? error.message : String(error);
        if (message.toLowerCase().includes("finder") && message.toLowerCase().includes("frontmost")) {
          return; // Silently ignore Finder not frontmost error
        }
        showToast({
          style: Toast.Style.Failure,
          title: "Cannot load file",
          message,
        });
      }
    }
    loadSelectedFile();
  }, []);

  async function processImage(imageDataURL: string) {
    try {
      // Validate API token
      if (!preferences.replicateApiToken || !preferences.replicateApiToken.trim()) {
        throw new Error("Replicate API token is not configured. Please add it in extension preferences.");
      }

      const response = await fetch(`https://api.replicate.com/v1/models/bria/remove-background/predictions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${preferences.replicateApiToken}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          input: {
            image: imageDataURL,
            content_moderation: false,
            preserve_partial_alpha: true,
          },
        }),
      });

      // Check for HTTP errors
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API token. Please check your Replicate API token in extension preferences.");
        }
        throw new Error(`API request failed with status ${response.status}`);
      }

      const prediction = (await response.json()) as ReplicatePrediction;
      if (prediction.output) {
        setProcessedImage(prediction.output);
      } else {
        throw new Error("Processing failed - no output received");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showFailureToast(message);
    }
  }

  if (!originalImage) {
    return (
      <>
        <Detail markdown="# Remove Background\n\nSelect an image to remove its background." />
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm
                title="Process Image"
                onSubmit={async (values: { file: string[] }) => {
                  const filePath = values.file[0];
                  if (!filePath) return;
                  if (!filePath.match(/\.(png|jpg|jpeg)$/i)) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Invalid file type",
                      message: "Please select a PNG or JPG image.",
                    });
                    return;
                  }
                  try {
                    const dataURL = prepareImage(filePath);
                    setOriginalImage(dataURL);
                    await processImage(dataURL);
                  } catch (error) {
                    console.log("[DEBUG] Caught error in Form submit:", error);
                    const message = error instanceof Error ? error.message : String(error);
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Please Resize Your Image",
                      message,
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        >
          <Form.FilePicker id="file" title="Select Image" allowMultipleSelection={false} />
        </Form>
      </>
    );
  }

  return (
    <Grid
      columns={2}
      aspectRatio="4/3"
      isLoading={!processedImage}
      selectedItemId={processedImage ? "processed" : undefined}
    >
      <Grid.Item id="original" title="Original" content={originalImage} />
      <Grid.Item
        id="processed"
        title={processedImage ? "Processed" : "Processing..."}
        subtitle={processedImage ? undefined : "Please wait while the image is being processed."}
        content={processedImage || ""}
        actions={
          processedImage ? (
            <ActionPanel>
              <Action
                title="Copy Processed Image"
                onAction={async () => {
                  try {
                    await copyProcessedImage(processedImage);
                  } catch {
                    showFailureToast("Failed to copy image");
                  }
                }}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.CopyToClipboard
                title="Copy Processed Image URL"
                content={processedImage}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
              <Action.Paste
                title="Paste Processed Image URL"
                content={processedImage}
                shortcut={{ modifiers: ["cmd"], key: "v" }}
              />
              <Action.OpenInBrowser
                title="Open Processed Image in Browser"
                url={processedImage}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            </ActionPanel>
          ) : undefined
        }
      />
    </Grid>
  );
}
