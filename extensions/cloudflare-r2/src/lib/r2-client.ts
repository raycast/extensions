import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  PutObjectCommand,
  type _Object,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getPreferenceValues } from "@raycast/api";
import { randomUUID } from "crypto";

interface Preferences {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain?: string;
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  const prefs = getPreferenceValues<Preferences>();
  client = new S3Client({
    region: "auto",
    endpoint: `https://${prefs.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: prefs.accessKeyId,
      secretAccessKey: prefs.secretAccessKey,
    },
  });
  return client;
}

function getBucketName(): string {
  return getPreferenceValues<Preferences>().bucketName;
}

export function getPublicUrl(key: string): string | null {
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.publicDomain) return null;
  const domain = prefs.publicDomain.replace(/\/$/, "");
  return `${domain}/${key}`;
}

export async function listObjects(): Promise<_Object[]> {
  const command = new ListObjectsV2Command({ Bucket: getBucketName() });
  const response = await getClient().send(command);
  return response.Contents ?? [];
}

export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });
  await getClient().send(command);
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType?: string,
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await getClient().send(command);
}

export async function getPresignedUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: getBucketName(), Key: key });
  return getSignedUrl(getClient(), command, { expiresIn });
}

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
};

export function getContentType(filePath: string): string {
  const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0] || "";
  return MIME_TYPES[ext] || "application/octet-stream";
}

export function generateFileName(originalPath: string): string {
  const ext = originalPath.toLowerCase().match(/\.[^.]+$/)?.[0] || ".png";
  return `${randomUUID()}${ext}`;
}
