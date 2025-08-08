import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import mime from "mime-types";
import { CloudProviderAccount } from "../cloudProviders";

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
  // Generate a presigned URL for the uploaded object
  let url = "";
  try {
    url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition: "inline" }),
      { expiresIn: Math.min(expiry, MAX_PRESIGN_EXPIRY) },
    );
  } catch {
    // fallback to public URL if possible
    if (endpoint) {
      url = `${endpoint.replace(/\/+$/, "")}/${bucket}/${key}`;
    } else {
      url = `https://${bucket}.s3.${region || "us-east-1"}.amazonaws.com/${key}`;
    }
  }
  return url;
}

export function getPublicS3Url(provider: CloudProviderAccount, filePath: string): string {
  const { bucket, endpoint, region, domain } = provider.credentials;
  const fileName = path.basename(filePath);
  const key = provider.defaultPath ? `${provider.defaultPath.replace(/\/+$/, "")}/${fileName}` : fileName;
  if (provider.accessLevel === "public" && domain) {
    return `${domain.replace(/\/+$/, "")}/${key}`;
  } else if (endpoint) {
    return `${endpoint.replace(/\/+$/, "")}/${bucket}/${key}`;
  } else {
    return `https://${bucket}.s3.${region || "us-east-1"}.amazonaws.com/${key}`;
  }
}
