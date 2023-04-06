import {
  SecretsManagerClient,
  ListSecretsCommand,
  GetSecretValueCommand,
  SecretListEntry,
} from "@aws-sdk/client-secrets-manager";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useState } from "react";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";

export default function Secrets() {
  const [search, setSearch] = useState<string>("");
  const [showValue, setShowValue] = useState<boolean>(false);
  const { data: secrets, error, isLoading, revalidate } = useCachedPromise(fetchSecrets, [search]);

  const showDetailFn = useCallback(() => setShowValue(!showValue), [showValue]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showValue}
      searchBarPlaceholder="Filter secrets by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
      onSearchTextChange={setSearch}
      throttle
    >
      {search.length < 4 ? (
        <List.EmptyView
          title="Missing Search Query"
          icon={Icon.MagnifyingGlass}
          description="The search will begin when at least 4 characters are provided."
        />
      ) : error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        secrets?.map((secret) => (
          <Secret key={secret.Name} secret={secret} showValue={showValue} setShowValue={showDetailFn} />
        ))
      )}
    </List>
  );
}

function Secret({
  secret,
  showValue,
  setShowValue,
}: {
  secret: SecretListEntry;
  showValue: boolean;
  setShowValue: () => void;
}) {
  const { data: secretDetails } = useCachedPromise(fetchSecret, [secret.ARN]);
  return (
    <List.Item
      id={secret.Name || ""}
      icon={"aws-icons/secretsmanager.png"}
      title={secret.Name || ""}
      detail={
        <List.Item.Detail
          markdown={secretDetails?.SecretString || secretDetails?.SecretBinary?.toString() || ""}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Description" text={secret.Description} />
              <List.Item.Detail.Metadata.Label title="ARN" text={secret.ARN} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Creation Date" text={secret.CreatedDate?.toLocaleString()} />
              <List.Item.Detail.Metadata.Label title="Last Accessed" text={secret.LastAccessedDate?.toLocaleString()} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Rotation" text={secret.RotationEnabled ? "true" : "false"} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action title={showValue ? "Hide Value" : "Show Value"} onAction={() => setShowValue()} />
          <Action.CopyToClipboard title="Copy Value" content={secretDetails?.SecretString || ""} />
          <Action.CopyToClipboard title="Copy ARN" content={secret.ARN || ""} />
          <Action.OpenInBrowser
            title="Open Secret"
            url={resourceToConsoleLink(secret.Name, "AWS::SecretsManager::Secret")}
          />
          <Action.CopyToClipboard title="Copy Name" content={secret.Name || ""} />
        </ActionPanel>
      }
      accessories={[{ icon: showValue ? Icon.Eye : Icon.EyeDisabled }]}
    />
  );
}

async function fetchSecrets(
  search: string,
  token?: string,
  accSecrets?: SecretListEntry[]
): Promise<SecretListEntry[]> {
  if (search.length < 4) return [];
  if (!process.env.AWS_PROFILE) return [];

  const { NextToken, SecretList } = await new SecretsManagerClient({}).send(
    new ListSecretsCommand({
      NextToken: token,
      Filters: [{ Key: "all", Values: [search] }],
    })
  );

  const combinedLogGroups = [...(accSecrets || []), ...(SecretList || [])];

  if (NextToken) {
    return fetchSecrets(search, NextToken, combinedLogGroups);
  }

  return combinedLogGroups;
}

async function fetchSecret(arn?: string): Promise<{ SecretString?: string; SecretBinary?: Uint8Array } | undefined> {
  if (!arn) return;
  const { SecretString, SecretBinary } = await new SecretsManagerClient({}).send(
    new GetSecretValueCommand({ SecretId: arn })
  );
  return { SecretString, SecretBinary };
}
