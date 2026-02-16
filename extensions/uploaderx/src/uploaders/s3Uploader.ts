import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import mime from "mime-types";
import { CloudProviderAccount } from "../cloudProviders";
import { encodeKey } from "../utils/fileUtils";

export const MAX_PRESIGN_EXPIRY = 60 * 60 * 24 * 6; // 6 days

export async function uploadToS3(
  provider: CloudProviderAccount,
  filePath: string,
  defaultPath: string,
  expiry: number,
): Promise<string> {
  const { accessKeyId, secretAccessKey, bucket, endpoint, region } = provider.credentials;
  const s3 = new S3Client({
    region: region || "us-east-1",
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    endpoint: endpoint || undefined,
    forcePathStyle: !!endpoint, // needed for custom endpoints
  });
  const fileStream = fs.createReadStream(filePath);
  const fileName = path.basename(filePath);
  const key = defaultPath ? `${defaultPath.replace(/\/+$/, "")}/${fileName}` : fileName;
  const contentType = mime.lookup(fileName) || undefined;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileStream,
      ACL: provider.accessLevel === "public" ? "public-read" : undefined,
      ContentType: contentType,
      ContentDisposition: "inline",
    }),
  );
  // For public objects with no expiry requested, return the stable public URL directly
  if (expiry <= 0 && provider.accessLevel === "public") {
    return getPublicS3Url(provider, filePath);
  }

  // Generate a presigned URL for the uploaded object when expiry is set or for private access
  const effectiveExpiry = expiry > 0 ? Math.min(expiry, MAX_PRESIGN_EXPIRY) : MAX_PRESIGN_EXPIRY;
  try {
    return await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition: "inline" }),
      { expiresIn: effectiveExpiry },
    );
  } catch {
    // Fallback to a public-style URL if presigning fails
    const encodedKey = encodeKey(key);
    if (endpoint) {
      return `${endpoint.replace(/\/+$/, "")}/${bucket}/${encodedKey}`;
    }
    return `https://${bucket}.s3.${region || "us-east-1"}.amazonaws.com/${encodedKey}`;
  }
}

export function getPublicS3Url(provider: CloudProviderAccount, filePath: string): string {
  const { bucket, endpoint, region, domain } = provider.credentials;
  const fileName = path.basename(filePath);
  const key = provider.defaultPath ? `${provider.defaultPath.replace(/\/+$/, "")}/${fileName}` : fileName;
  const encodedKey = encodeKey(key);
  if (provider.accessLevel === "public" && domain) {
    return `${domain.replace(/\/+$/, "")}/${encodedKey}`;
  } else if (endpoint) {
    return `${endpoint.replace(/\/+$/, "")}/${bucket}/${encodedKey}`;
  } else {
    return `https://${bucket}.s3.${region || "us-east-1"}.amazonaws.com/${encodedKey}`;
  }
}
