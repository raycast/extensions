import { ECRClient } from "@aws-sdk/client-ecr";
import { clientCache } from "../client-cache";

export function getECRClient(): ECRClient {
  return clientCache.getClient(ECRClient, "ecr");
}
