import { APIGatewayClient } from "@aws-sdk/client-api-gateway";
import { ApiGatewayV2Client } from "@aws-sdk/client-apigatewayv2";
import { clientCache } from "../client-cache";

export function getApiGatewayClient(): APIGatewayClient {
  return clientCache.getClient(APIGatewayClient, "apigateway");
}

export function getApiGatewayV2Client(): ApiGatewayV2Client {
  return clientCache.getClient(ApiGatewayV2Client, "apigatewayv2");
}
