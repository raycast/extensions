import {
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
  getSelectedFinderItems,
  openExtensionPreferences,
} from "@raycast/api";
import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { getContentType } from "./lib/clipboard";
import { uploadToS3 } from "./lib/s3";
import { buildPublicUrl, formatUrl, UrlFormat } from "./lib/format";
import { prettyBytes } from "./lib/bytes";

interface Preferences {
  s3Endpoint: string;
  s3Region: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3KeyPrefix: string;
  s3PathStyle: "path" | "virtual";
  useCustomPublicUrl: boolean;
  publicUrlBase?: string;
  urlFormat: UrlFormat;
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"];

function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  return IMAGE_EXTENSIONS.includes(ext);
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Reading Finder selection...",
  });

  try {
    // Step 1: Get selected Finder items
    let items;
    try {
      items = await getSelectedFinderItems();
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Finder Not Active";
      toast.message = "Please switch to Finder and select image files first.";
      return;
    }

    if (items.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "No Files Selected";
      toast.message = "Please select image files in Finder first.";
      return;
    }

    // Step 2: Filter image files
    const imagePaths = items.map((i) => i.path).filter(isImageFile);

    if (imagePaths.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "No Images Found";
      toast.message = "Selected files are not images (supported: PNG, JPG, WebP, GIF, SVG, BMP, ICO).";
      return;
    }

    // Step 3: Process and upload each image
    const uploadedUrls: string[] = [];
    const totalImages = imagePaths.length;
    let totalSize = 0;

    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      const filename = path.basename(imagePath);
      const extension = path.extname(imagePath).toLowerCase().slice(1);

      toast.title = `Uploading ${i + 1}/${totalImages}...`;
      toast.message = filename;

      // Read file
      const data = await fs.readFile(imagePath);
      totalSize += data.length;

      // Generate key
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const uuid = uuidv4().slice(0, 8);
      const key = `${preferences.s3KeyPrefix || ""}${timestamp}-${uuid}.${extension}`;

      // Upload to S3
      await uploadToS3({
        s3: {
          endpoint: preferences.s3Endpoint,
          region: preferences.s3Region,
          bucket: preferences.s3Bucket,
          accessKeyId: preferences.s3AccessKeyId,
          secretAccessKey: preferences.s3SecretAccessKey,
          forcePathStyle: preferences.s3PathStyle === "path",
        },
        key,
        body: data,
        contentType: getContentType(extension),
      });

      // Generate URL
      const url = buildPublicUrl({
        useCustomPublicUrl: preferences.useCustomPublicUrl,
        publicUrlBase: preferences.publicUrlBase,
        s3Endpoint: preferences.s3Endpoint,
        s3Bucket: preferences.s3Bucket,
        s3PathStyle: preferences.s3PathStyle,
        key,
      });

      const formattedUrl = formatUrl(url, preferences.urlFormat);
      uploadedUrls.push(formattedUrl);
    }

    // Step 4: Copy URLs to clipboard
    const output = uploadedUrls.join("\n");
    await Clipboard.copy(output);

    // Step 5: Show success
    toast.style = Toast.Style.Success;
    toast.title = `Uploaded ${uploadedUrls.length} Image${uploadedUrls.length > 1 ? "s" : ""}`;
    toast.message = `${prettyBytes(totalSize)} • URLs copied`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Upload Failed";
    toast.message = error instanceof Error ? error.message : String(error);
    toast.primaryAction = {
      title: "Open Preferences",
      onAction: () => openExtensionPreferences(),
    };
  }
}
