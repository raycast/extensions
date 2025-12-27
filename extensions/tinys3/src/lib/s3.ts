import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export type UploadOptions = {
  s3: S3Config;
  key: string;
  body: Buffer;
  contentType: string;
};

/**
 * Upload file to S3-compatible storage using AWS SDK v3.
 */
export async function uploadToS3(options: UploadOptions): Promise<void> {
  const client = new S3Client({
    region: options.s3.region,
    endpoint: options.s3.endpoint,
    credentials: {
      accessKeyId: options.s3.accessKeyId,
      secretAccessKey: options.s3.secretAccessKey,
    },
    forcePathStyle: options.s3.forcePathStyle,
  });

  await client.send(
    new PutObjectCommand({
      Bucket: options.s3.bucket,
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType,
    }),
  );
}
