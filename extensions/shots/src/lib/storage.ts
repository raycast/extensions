import { DeleteObjectCommand, PutObjectCommand, PutObjectCommandOutput, S3Client } from "@aws-sdk/client-s3";

import { ExtensionConfig } from "./config-core";

const BASE_DELAY_MS = 500;

export interface UploadInput {
  objectKey: string;
  body: Buffer;
  contentType: string;
}

export interface UploadResult {
  attempts: number;
  etag?: string;
}

interface RetryOptions {
  maxRetries: number;
  shouldRetry: (error: unknown) => boolean;
  delayMs?: (retryAttempt: number) => number;
  sleep?: (ms: number) => Promise<void>;
}

export function createS3Client(config: ExtensionConfig): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function uploadWithRetry(
  config: ExtensionConfig,
  input: UploadInput,
  client: S3Client = createS3Client(config),
): Promise<UploadResult> {
  const result = await retryWithBackoff<PutObjectCommandOutput>(
    () =>
      client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: input.objectKey,
          Body: input.body,
          ContentType: input.contentType,
        }),
      ),
    {
      maxRetries: config.maxRetries,
      shouldRetry: isTransientUploadError,
    },
  );

  return {
    attempts: result.attempts,
    etag: result.value.ETag,
  };
}

export async function deleteObject(
  config: ExtensionConfig,
  objectKey: string,
  client: S3Client = createS3Client(config),
): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
    }),
  );
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<{ value: T; attempts: number }> {
  const maxAttempts = options.maxRetries + 1;
  const sleep = options.sleep ?? defaultSleep;
  const delayFn = options.delayMs ?? calculateBackoffMs;

  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      const value = await operation();
      return { value, attempts };
    } catch (error: unknown) {
      const canRetry = attempts < maxAttempts && options.shouldRetry(error);
      if (!canRetry) throw error;
      const retryAttempt = attempts;
      await sleep(delayFn(retryAttempt));
    }
  }

  throw new Error("Retry loop exited unexpectedly.");
}

export function calculateBackoffMs(retryAttempt: number): number {
  const exponential = BASE_DELAY_MS * 2 ** Math.max(0, retryAttempt - 1);
  const jitter = Math.floor(Math.random() * 100);
  return exponential + jitter;
}

export function isTransientUploadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    name?: string;
    code?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const statusCode = candidate.$metadata?.httpStatusCode;
  if (statusCode !== undefined) {
    if (statusCode >= 500 || statusCode === 429 || statusCode === 408) {
      return true;
    }
    if (statusCode >= 400) return false;
  }

  const combined = `${candidate.name ?? ""} ${candidate.code ?? ""} ${candidate.message ?? ""}`.toLowerCase();
  return ["timeout", "throttle", "network", "econn", "etimedout", "enotfound", "socket"].some((token) =>
    combined.includes(token),
  );
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
