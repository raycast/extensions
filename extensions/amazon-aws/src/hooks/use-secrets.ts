import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import { GetResourcePolicyCommand, GetSecretValueCommand, ListSecretsCommand } from "@aws-sdk/client-secrets-manager";
import { getSecretsManagerClient } from "../services/clients/secrets-manager";

export const useSecrets = (search: string) => {
  const {
    data: secrets,
    error,
    isLoading,
    mutate,
  } = useCachedPromise(
    async (query: string) => {
      const { SecretList } = await getSecretsManagerClient().send(
        new ListSecretsCommand({
          MaxResults: 50,
          ...(query.trim().length > 2 && { Filters: [{ Key: "all", Values: [search] }] }),
        }),
      );
      return (SecretList ?? []).filter((secret) => !!secret && !!secret.ARN && !!secret.Name);
    },
    [search],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load secrets" } },
  );

  return { secrets, error, isLoading: (!secrets && !error) || isLoading, mutate };
};

export const useSecretValue = (secretId: string) => {
  const {
    data: secret,
    error,
    isLoading,
  } = useCachedPromise(
    async (id: string) => {
      const { SecretString } = await getSecretsManagerClient().send(new GetSecretValueCommand({ SecretId: id }));

      let md = "## Secret Value\n\n```";
      let value = SecretString;
      let json = undefined;

      try {
        json = JSON.parse(SecretString || "");
        md += `json\n${JSON.stringify(json, null, 4)}`;
        value = JSON.stringify(json, null, 4);
      } catch {
        md += `text\n${SecretString}`;
      }

      return { value, markdown: md + "\n```", json };
    },
    [secretId],
    { execute: isReadyToFetch() },
  );

  return { secret, isLoading: (!secret && !error) || isLoading };
};

export const useSecretPolicy = (secretId: string) => {
  const {
    data: policy,
    error,
    isLoading,
  } = useCachedPromise(
    async (id: string) => {
      const { ResourcePolicy = "❗Not Yet Defined" } = await getSecretsManagerClient().send(
        new GetResourcePolicyCommand({ SecretId: id }),
      );

      let md = "## Resource Policy\n\n```";
      let value = ResourcePolicy;

      try {
        const json = JSON.parse(ResourcePolicy || "");
        md += `json\n${JSON.stringify(json, null, 4)}`;
        value = JSON.stringify(json, null, 4);
      } catch {
        md += `text\n${ResourcePolicy}`;
      }

      return { value, markdown: md + "\n```" };
    },
    [secretId],
    { execute: isReadyToFetch() },
  );

  return { policy, isLoading: (!policy && !error) || isLoading };
};
