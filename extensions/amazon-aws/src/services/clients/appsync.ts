import { AppSyncClient } from "@aws-sdk/client-appsync";
import { clientCache } from "../client-cache";

export function getAppSyncClient(): AppSyncClient {
  return clientCache.getClient(AppSyncClient, "appsync");
}
