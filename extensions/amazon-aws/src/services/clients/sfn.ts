import { SFNClient } from "@aws-sdk/client-sfn";
import { clientCache } from "../client-cache";

export function getSFNClient(): SFNClient {
  return clientCache.getClient(SFNClient, "sfn");
}
