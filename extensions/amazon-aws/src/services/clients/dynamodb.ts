import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { clientCache } from "../client-cache";

export function getDynamoDBClient(): DynamoDBClient {
  return clientCache.getClient(DynamoDBClient, "dynamodb");
}
