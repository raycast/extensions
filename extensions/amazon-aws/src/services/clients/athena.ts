import { AthenaClient } from "@aws-sdk/client-athena";
import { clientCache } from "../client-cache";

export function getAthenaClient(): AthenaClient {
  return clientCache.getClient(AthenaClient, "athena");
}
