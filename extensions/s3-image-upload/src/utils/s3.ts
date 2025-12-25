import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getPreferenceValues } from "@raycast/api";
import * as crypto from "crypto";
import * as path from "path";

interface Preferences {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  customDomain?: string;
  prefix?: string;
}

interface UploadResult {
  url: string;
  key: string;
}

function getS3Client(): S3Client {
  const preferences = getPreferenceValues<Preferences>();

  return new S3Client({
    region: preferences.region,
    credentials: {
      accessKeyId: preferences.accessKeyId,
      secretAccessKey: preferences.secretAccessKey,
    },
  });
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".ico": "image/x-icon",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
  };

  return mimeTypes[ext] || "application/octet-stream";
}

function generateUniqueFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename);
  const timestamp = Date.now();
  const uniqueId = crypto.randomBytes(4).toString("hex");
  return `${timestamp}-${uniqueId}${ext}`;
}

export async function uploadToS3(
  buffer: Buffer,
  originalFilename: string,
): Promise<UploadResult> {
  const preferences = getPreferenceValues<Preferences>();
  const client = getS3Client();

  const filename = generateUniqueFilename(originalFilename);
  const prefix = preferences.prefix
    ? preferences.prefix.replace(/\/$/, "") + "/"
    : "";
  const key = `${prefix}${filename}`;
  const contentType = getContentType(originalFilename);

  const command = new PutObjectCommand({
    Bucket: preferences.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await client.send(command);

  let url: string;
  if (preferences.customDomain) {
    const domain = preferences.customDomain.replace(/\/$/, "");
    url = `${domain}/${key}`;
  } else {
    url = `https://${preferences.bucket}.s3.${preferences.region}.amazonaws.com/${key}`;
  }

  return { url, key };
}

export function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  const imageExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".bmp",
    ".ico",
    ".tiff",
    ".tif",
  ];
  return imageExtensions.includes(ext);
}

interface ErrorInfo {
  title: string;
  message: string;
}

export function getS3ErrorMessage(error: unknown): ErrorInfo {
  if (error instanceof Error) {
    const errorName = (error as { name?: string }).name || "";
    const errorCode = (error as { Code?: string }).Code || "";

    // AWS 凭证错误
    if (
      errorCode === "InvalidAccessKeyId" ||
      errorName === "InvalidAccessKeyId"
    ) {
      return {
        title: "Invalid AWS Access Key",
        message: "Please check your AWS Access Key ID in settings",
      };
    }

    if (
      errorCode === "SignatureDoesNotMatch" ||
      errorName === "SignatureDoesNotMatch"
    ) {
      return {
        title: "Invalid AWS Secret Key",
        message: "Please check your AWS Secret Access Key in settings",
      };
    }

    // Bucket 错误
    if (errorCode === "NoSuchBucket" || errorName === "NoSuchBucket") {
      return {
        title: "Bucket not found",
        message: "The specified S3 bucket does not exist",
      };
    }

    if (errorCode === "AccessDenied" || errorName === "AccessDenied") {
      return {
        title: "Access denied",
        message: "No permission to upload to this bucket",
      };
    }

    // 网络错误
    if (
      errorName === "NetworkingError" ||
      error.message.includes("ENOTFOUND")
    ) {
      return {
        title: "Network error",
        message: "Please check your internet connection",
      };
    }

    // 默认错误
    return {
      title: "Upload failed",
      message: error.message,
    };
  }

  return {
    title: "Upload failed",
    message: "Unknown error occurred",
  };
}
