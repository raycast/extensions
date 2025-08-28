import { showToast, Toast, getSelectedFinderItems, Clipboard, getPreferenceValues } from "@raycast/api";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { convertToAvif } from "./utils/convert";

interface Preferences {
  r2BucketName: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2AccountId: string;
  customDomain: string;
  fileNameFormat: string;
  convertToAvif: boolean;
  avifencPath: string;
}

function isAvifencAvailable(customPath?: string): boolean {
  const avifencPath = customPath || "/opt/homebrew/bin/avifenc";

  try {
    execFileSync(avifencPath, ["--version"]);
    return true;
  } catch {
    try {
      execFileSync("avifenc", ["--version"]);
      return true;
    } catch {
      return false;
    }
  }
}

async function generateFileName(originalPath: string, format: string, customExtension?: string): Promise<string> {
  const ext = customExtension || path.extname(originalPath).toLowerCase();
  const basename = path.basename(originalPath, path.extname(originalPath));

  if (!format) {
    if (customExtension) {
      return basename + customExtension;
    }
    return path.basename(originalPath);
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  let formattedName = format
    .replace(/{name}/g, basename)
    .replace(/{ext}/g, ext.substring(1))
    .replace(/{year}/g, String(year))
    .replace(/{month}/g, month)
    .replace(/{day}/g, day)
    .replace(/{hours}/g, hours)
    .replace(/{minutes}/g, minutes)
    .replace(/{seconds}/g, seconds);

  if (!path.extname(formattedName)) {
    formattedName += ext;
  } else if (path.extname(formattedName) !== ext) {
    formattedName = path.basename(formattedName, path.extname(formattedName)) + ext;
  }

  return formattedName;
}

async function uploadToR2(
  filePath: string,
  customFileName: string | undefined,
): Promise<{ url: string; markdown: string }> {
  const preferences = getPreferenceValues<Preferences>();
  const {
    r2BucketName: bucketName,
    r2AccessKeyId: accessKeyId,
    r2SecretAccessKey: secretAccessKey,
    r2AccountId: accountId,
    customDomain,
    fileNameFormat,
  } = preferences;

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  const s3Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });

  const fileContent = await fs.promises.readFile(filePath);

  const finalFileName =
    customFileName || (await generateFileName(filePath, fileNameFormat || "", path.extname(filePath)));
  const key = finalFileName;

  const fileExt = path.extname(filePath).toLowerCase();
  let contentType = "image/jpeg";
  if (fileExt === ".png") {
    contentType = "image/png";
  } else if (fileExt === ".gif") {
    contentType = "image/gif";
  } else if (fileExt === ".webp") {
    contentType = "image/webp";
  } else if (fileExt === ".avif") {
    contentType = "image/avif";
  }

  const putObjectCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileContent,
    ContentType: contentType,
  });

  await s3Client.send(putObjectCommand);

  let url: string;
  if (customDomain) {
    const cleanDomain = customDomain.replace(/\/$/, "");
    url = `${cleanDomain}/${key}`;
  } else {
    url = `${endpoint}/${bucketName}/${key}`;
  }

  const markdown = `![${path.basename(key, path.extname(key))}](${url})`;

  return { url, markdown };
}

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();

    if (!selectedItems || selectedItems.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No file selected" });
      return;
    }

    const inputFilePath = selectedItems[0].path;

    const preferences = getPreferenceValues<Preferences>();
    const fileNameFormat = preferences.fileNameFormat;
    const shouldConvertToAvif = preferences.convertToAvif;

    let customFileName: string | undefined;

    if (fileNameFormat) {
      customFileName = await generateFileName(inputFilePath, fileNameFormat);
    }

    const toastUploading = await showToast({
      style: Toast.Style.Animated,
      title: "Uploading to Cloudflare R2...",
    });

    let newFilePath = inputFilePath;

    if (shouldConvertToAvif) {
      const avifencPath = preferences.avifencPath || "/opt/homebrew/bin/avifenc";
      if (!isAvifencAvailable(avifencPath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "AVIF conversion tool not found",
          message: "Please install libavif using 'brew install libavif' or check the path in extension preferences",
        });
      } else {
        try {
          newFilePath = await convertToAvif(inputFilePath, avifencPath);
        } catch (conversionError: unknown) {
          const error = conversionError as Error;
          await showToast({
            style: Toast.Style.Failure,
            title: "Conversion failed",
            message: error.message,
          });
          newFilePath = inputFilePath;
        }
      }
    }

    const { url, markdown } = await uploadToR2(newFilePath, customFileName);

    toastUploading.style = Toast.Style.Success;
    toastUploading.title = "Upload complete";
    toastUploading.message = url;

    Clipboard.copy(markdown);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred during upload";
    console.error("Upload error:", errorMessage);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: errorMessage,
    });
  }
}
