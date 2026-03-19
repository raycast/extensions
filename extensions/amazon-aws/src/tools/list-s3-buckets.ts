import { Bucket, ListBucketsCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "../services/clients/s3";

/**
 * Lists all S3 buckets in the current AWS account
 * @returns Promise<Bucket[]> Array of S3 buckets
 */
export default async function listS3Buckets(): Promise<Bucket[]> {
  const client = getS3Client();

  const command = new ListBucketsCommand({});
  const response = await client.send(command);

  return response.Buckets ?? [];
}
