import { ECSClient } from "@aws-sdk/client-ecs";
import { clientCache } from "../client-cache";

export function getECSClient(): ECSClient {
  return clientCache.getClient(ECSClient, "ecs");
}
