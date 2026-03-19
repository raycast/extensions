import { S3Client } from "@aws-sdk/client-s3";
import { clientCache } from "../client-cache";

export function getS3Client(): S3Client {
  return clientCache.getClient(S3Client, "s3");
}
