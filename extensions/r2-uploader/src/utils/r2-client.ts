import { getPreferenceValues } from "@raycast/api";
import { S3Client } from "@aws-sdk/client-s3";

export function createR2Client(): { client: S3Client; bucketName: string; endpoint: string; customDomain?: string } {
  const preferences = getPreferenceValues();
  const {
    r2BucketName: bucketName,
    r2AccessKeyId: accessKeyId,
    r2SecretAccessKey: secretAccessKey,
    r2AccountId: accountId,
    customDomain,
  } = preferences;

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });

  return { client, bucketName, endpoint, customDomain: customDomain || undefined };
}
