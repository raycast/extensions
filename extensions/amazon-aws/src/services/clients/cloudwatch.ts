import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { clientCache } from "../client-cache";

export function getCloudWatchClient(): CloudWatchClient {
  return clientCache.getClient(CloudWatchClient, "cloudwatch");
}
