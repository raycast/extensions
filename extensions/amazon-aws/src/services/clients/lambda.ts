import { LambdaClient } from "@aws-sdk/client-lambda";
import { clientCache } from "../client-cache";

export function getLambdaClient(): LambdaClient {
  return clientCache.getClient(LambdaClient, "lambda");
}
