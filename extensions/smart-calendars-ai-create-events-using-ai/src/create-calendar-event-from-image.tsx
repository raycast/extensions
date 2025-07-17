import { Clipboard, showToast, Toast, open, getSelectedFinderItems, Form, ActionPanel, Action } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { readFileSync } from "fs";
import { basename } from "path";
import { fileURLToPath } from "url";
import { useState, useEffect } from "react";
import { Jimp, JimpMime } from "jimp";

// Image processing function to convert any image to JPEG using Jimp v1 API
async function convertImageToJPEG(imageBuffer: Buffer): Promise<Buffer> {
  const originalSizeMB = imageBuffer.length / (1024 * 1024);

  try {
    // Load the image using Jimp v1 API
    const image = await Jimp.read(imageBuffer);

    // Convert to JPEG with 80% quality using v1 syntax
    const jpegBuffer = await image.getBuffer(JimpMime.jpeg, { quality: 80 });

    const compressedSizeMB = jpegBuffer.length / (1024 * 1024);

    console.log(`✅ Jimp v1 compression successful!`);
    console.log(
      `Original: ${originalSizeMB.toFixed(2)}MB → Compressed: ${compressedSizeMB.toFixed(2)}MB (${((1 - jpegBuffer.length / imageBuffer.length) * 100).toFixed(1)}% reduction)`,
    );

    return jpegBuffer;
  } catch (error) {
    console.log(`⚠️ Jimp processing failed for ${originalSizeMB.toFixed(2)}MB image:`, error);

    // Check if it might be an unsupported format
    const errorMessage = String(error);
    if (errorMessage.includes("Unsupported MIME type") || errorMessage.includes("format")) {
      await showFailureToast("Unsupported image format - Please use JPEG, PNG, GIF, BMP, or TIFF images");
      throw new Error("Unsupported image format");
    }

    // Fallback with more forgiving size limits when compression fails
    if (originalSizeMB > 10) {
      await showFailureToast(`Image too large (${originalSizeMB.toFixed(1)}MB) - Please use images smaller than 10MB`);
      throw new Error("Image file too large");
    }

    if (originalSizeMB > 3) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Large image warning",
        message: `Image is ${originalSizeMB.toFixed(1)}MB. Compression failed, using original size. This may cause issues.`,
      });
    }

    console.log(`📝 Using original image at ${originalSizeMB.toFixed(2)}MB`);
    return imageBuffer;
  }
}

// Function to process image data and send to Smart Calendars
async function processImageData(imageData: Buffer, imageSource: string, fileName: string) {
  try {
    // Show processing toast
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Converting image to JPEG...",
    });

    // Convert image to JPEG format (like Share Extension does)
    const jpegImageData = await convertImageToJPEG(imageData);

    // Convert JPEG image data to base64
    loadingToast.title = "Converting to base64...";

    const base64String = jpegImageData.toString("base64");

    if (!base64String) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to process image",
        message: "Could not convert image to base64",
      });
      return;
    }

    // Log the size for debugging
    console.log(`Original image size: ${imageData.length} bytes`);
    console.log(`Processed image size: ${jpegImageData.length} bytes`);
    console.log(`Base64 size: ${base64String.length} characters`);

    // URL encode the base64 string
    const encodedImage = encodeURIComponent(base64String);

    // Construct the URL using the image scheme
    const url = `smartcalendars://image/${encodedImage}`;

    // Update toast
    loadingToast.title = "Creating calendar event/reminder from image...";

    // Open the URL
    await open(url);

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: "Calendar event/reminder created",
      message: `Image "${fileName}" from ${imageSource} sent to Smart Calendars app`,
    });
  } catch {
    // Show error toast
    await showFailureToast("Failed to create calendar event/reminder");
  }
}

export default function Command() {
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function checkForImages() {
      try {
        // Show initial toast
        const loadingToast = await showToast({
          style: Toast.Style.Animated,
          title: "Checking for image...",
        });

        let imageData: Buffer | null = null;
        let imageSource = "";
        let fileName = "";

        // Step 1: Check clipboard for image
        try {
          const clipboardImage = await Clipboard.read();

          if (clipboardImage.file) {
            // Image file in clipboard - convert file URL to path
            let filePath: string;
            if (clipboardImage.file.startsWith("file://")) {
              // Convert file URL to path and decode URL encoding
              filePath = fileURLToPath(clipboardImage.file);
            } else {
              // Already a path
              filePath = clipboardImage.file;
            }

            imageData = readFileSync(filePath);
            imageSource = "clipboard";
            fileName = basename(filePath) || "clipboard image";

            loadingToast.title = "Found image in clipboard";
            console.log(`✅ Successfully loaded clipboard image from: ${filePath}`);
          } else if (clipboardImage.html && clipboardImage.html.includes("<img")) {
            // HTML with image in clipboard - extract image URL if possible
            const imgMatch = clipboardImage.html.match(/src="([^"]*data:image[^"]*)"/);
            if (imgMatch && imgMatch[1]) {
              const dataUrl = imgMatch[1];
              const base64Data = dataUrl.split(",")[1];
              imageData = Buffer.from(base64Data, "base64");
              imageSource = "clipboard (HTML)";
              fileName = "clipboard HTML image";

              loadingToast.title = "Found image in clipboard HTML";
            }
          }
        } catch (error) {
          // Clipboard doesn't contain an image, continue to next step
          console.log("No image in clipboard:", error);
        }

        // Step 2: If no image in clipboard, try to get selected Finder items
        if (!imageData) {
          try {
            loadingToast.title = "Checking selected files...";

            const selectedItems = await getSelectedFinderItems();

            if (selectedItems.length > 0) {
              const selectedItem = selectedItems[0];

              // Check if selected file is an image (Jimp v1.6 supported formats only)
              const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif"];
              const isImage = imageExtensions.some((ext) => selectedItem.path.toLowerCase().endsWith(ext));

              if (isImage) {
                imageData = readFileSync(selectedItem.path);
                imageSource = "selected file";
                fileName = basename(selectedItem.path);

                loadingToast.title = "Found selected image";
              }
            }
          } catch (error) {
            console.log("No selected image files:", error);
          }
        }

        // Step 3: If we found an image, process it directly
        if (imageData) {
          loadingToast.hide();
          await processImageData(imageData, imageSource, fileName);
          return;
        }

        // Step 4: If no image found, show file picker form
        loadingToast.hide();
        setShowForm(true);
      } catch (error) {
        // Show error toast
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to create calendar event/reminder",
          message: String(error),
        });
        setShowForm(true);
      }
    }

    checkForImages();
  }, []);

  async function handleSubmit(values: { file: string[] }) {
    const filePath = values.file?.[0];
    if (filePath) {
      try {
        const fileData = readFileSync(filePath);
        const fileName = basename(filePath);
        await processImageData(fileData, "file picker", fileName);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to read image file",
          message: String(error),
        });
      }
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
        message: "Please select an image file below:",
      });
    }
  }

  if (!showForm) {
    // Show loading state while checking for images
    return (
      <Form>
        <Form.Description text="Checking for images in clipboard and selected files..." />
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Event/reminder from Image" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="No image found in clipboard or selected files. Please choose an image file below (JPEG, PNG, GIF, BMP, TIFF):" />
      <Form.FilePicker id="file" title="Select Image File" allowMultipleSelection={false} />
    </Form>
  );
}
