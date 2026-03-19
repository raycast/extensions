import { SSMClient } from "@aws-sdk/client-ssm";
import { clientCache } from "../client-cache";

export function getSSMClient(): SSMClient {
  return clientCache.getClient(SSMClient, "ssm");
}
