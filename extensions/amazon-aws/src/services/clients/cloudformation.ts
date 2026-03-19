import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { clientCache } from "../client-cache";

export function getCloudFormationClient(): CloudFormationClient {
  return clientCache.getClient(CloudFormationClient, "cloudformation");
}
