import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Preferences } from "./types";

export function createR2Client(prefs: Pick<Preferences, "accountId" | "accessKeyId" | "secretAccessKey">): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${prefs.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: prefs.accessKeyId,
      secretAccessKey: prefs.secretAccessKey,
    },
  });
}

export async function putObject(params: {
  client: S3Client;
  bucket: string;
  key: string;
  body: Uint8Array | Buffer;
  contentType?: string;
}): Promise<void> {
  await params.client.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );
}
