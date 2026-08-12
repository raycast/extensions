import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createR2Client } from "./r2-client";

const PREVIEW_URL_EXPIRY_SECONDS = 300;

export async function getPreviewUrl(key: string): Promise<string> {
  const { client, bucketName } = createR2Client();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucketName, Key: key }), {
    expiresIn: PREVIEW_URL_EXPIRY_SECONDS,
  });
}
