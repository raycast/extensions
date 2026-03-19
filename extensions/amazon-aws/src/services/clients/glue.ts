import { GlueClient } from "@aws-sdk/client-glue";
import { clientCache } from "../client-cache";

export function getGlueClient(): GlueClient {
  return clientCache.getClient(GlueClient, "glue");
}
