import { SQSClient } from "@aws-sdk/client-sqs";
import { clientCache } from "../client-cache";

export function getSQSClient(): SQSClient {
  return clientCache.getClient(SQSClient, "sqs");
}
