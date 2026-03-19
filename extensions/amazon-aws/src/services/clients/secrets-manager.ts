import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { clientCache } from "../client-cache";

export function getSecretsManagerClient(): SecretsManagerClient {
  return clientCache.getClient(SecretsManagerClient, "secretsmanager");
}
