import { QuickSightClient } from "@aws-sdk/client-quicksight";
import { STSClient } from "@aws-sdk/client-sts";
import { clientCache } from "../client-cache";

export function getQuickSightClient(regionOverride?: string): QuickSightClient {
  return clientCache.getClient(QuickSightClient, "quicksight", regionOverride);
}

export function getSTSClient(): STSClient {
  return clientCache.getClient(STSClient, "sts");
}
