import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import {
  GetResourcePolicyCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

export const useSecrets = (search: string) => {
  const {
    data: secrets,
    error,
    isLoading,
    revalidate,
    pagination,
  } = useCachedPromise(
    (query: string) =>
      async ({ page, cursor }: { page: number; cursor?: string }) => {
        const { NextToken, SecretList } = await new SecretsManagerClient({}).send(
          new ListSecretsCommand({
            NextToken: cursor,
            MaxResults: 100,
            ...(query.trim().length > 2 && { Filters: [{ Key: "all", Values: [search] }] }),
          }),
        );

        const keyedSecrets = await Promise.all(
          (SecretList ?? []).map(async (secret) => {
            const { ResourcePolicy: resourcePolicy } = await new SecretsManagerClient({}).send(
              new GetResourcePolicyCommand({ SecretId: secret.ARN }),
            );
            return { ...secret, secretKey: `#${page}-${secret.ARN}`, resourcePolicy };
          }),
        );

        return { data: keyedSecrets, hasMore: !!NextToken, cursor: NextToken };
      },
    [search],
    { execute: isReadyToFetch() },
  );

  return { secrets, error, isLoading: (!secrets && !error) || isLoading, revalidate, pagination };
};

export const useSecretValue = (secretId: string) => {
  const {
    data: secret,
    error,
    isLoading,
  } = useCachedPromise(
    async (id: string) => {
      const { SecretString } = await new SecretsManagerClient({}).send(new GetSecretValueCommand({ SecretId: id }));

      let md = "## Secret Value\n\n```";
      let value = SecretString;

      try {
        const json = JSON.parse(SecretString || "");
        md += `json\n${JSON.stringify(json, null, 4)}`;
        value = JSON.stringify(json, null, 4);
      } catch {
        md += `text\n${SecretString}`;
      }

      return { value, markdown: md + "\n```" };
    },
    [secretId],
    { execute: isReadyToFetch() },
  );

  return { secret, isLoading: (!secret && !error) || isLoading };
};
