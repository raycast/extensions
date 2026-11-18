import { getPreferenceValues } from "@raycast/api";
import { S3Client } from "@aws-sdk/client-s3";

let cachedClient: { client: S3Client; accountId: string; accessKeyId: string; secretAccessKey: string } | undefined;

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

  if (
    !cachedClient ||
    cachedClient.accountId !== accountId ||
    cachedClient.accessKeyId !== accessKeyId ||
    cachedClient.secretAccessKey !== secretAccessKey
  ) {
    cachedClient?.client.destroy();
    const client = new S3Client({
      region: "auto",
      endpoint,
      requestChecksumCalculation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
    cachedClient = { client, accountId, accessKeyId, secretAccessKey };
  }

  return { client: cachedClient.client, bucketName, endpoint, customDomain: customDomain || undefined };
}
