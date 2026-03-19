import { SecretListEntry, ListSecretsCommand } from "@aws-sdk/client-secrets-manager";
import { getSecretsManagerClient } from "../services/clients/secrets-manager";

/**
 * Lists all secrets in the current AWS account and region
 * @returns Promise<SecretListEntry[]> Array of secret list entries
 */
export default async function listSecrets(): Promise<SecretListEntry[]> {
  const client = getSecretsManagerClient();

  const secrets: SecretListEntry[] = [];
  let nextToken: string | undefined;

  do {
    const command = new ListSecretsCommand({ NextToken: nextToken });
    const response = await client.send(command);

    if (response.SecretList) {
      secrets.push(...response.SecretList.filter((s) => s.ARN && s.Name));
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return secrets;
}
