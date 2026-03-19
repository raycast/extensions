import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { clientCache } from "../client-cache";

export function getCognitoClient(): CognitoIdentityProviderClient {
  return clientCache.getClient(CognitoIdentityProviderClient, "cognito");
}
