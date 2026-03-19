import { _Object, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getS3Client } from "../services/clients/s3";

/**
 * Lists objects in an S3 bucket with optional prefix filtering
 * @param options.bucketName - The name of the S3 bucket
 * @param options.prefix - Optional prefix to filter objects
 * @param options.maxKeys - Maximum number of objects to return (default: 100)
 * @returns Promise<_Object[]> Array of S3 objects
 */
export default async function listS3Objects(options: {
  bucketName: string;
  prefix?: string;
  maxKeys?: number;
}): Promise<_Object[]> {
  const client = getS3Client();
  const maxKeys = options.maxKeys ?? 100;

  const objects: _Object[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: options.bucketName,
      Prefix: options.prefix,
      MaxKeys: maxKeys - objects.length,
      ContinuationToken: continuationToken,
    });
    const response = await client.send(command);

    if (response.Contents) {
      objects.push(...response.Contents);
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken && objects.length < maxKeys);

  return objects;
}
