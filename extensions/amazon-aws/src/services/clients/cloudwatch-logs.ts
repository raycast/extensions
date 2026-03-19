import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { clientCache } from "../client-cache";

export function getCloudWatchLogsClient(): CloudWatchLogsClient {
  return clientCache.getClient(CloudWatchLogsClient, "cloudwatchlogs");
}
