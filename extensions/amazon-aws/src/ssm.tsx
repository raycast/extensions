import {
  DescribeParametersCommand,
  GetParameterCommand,
  Parameter,
  ParameterMetadata,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import AWSProfileDropdown, { AWS_URL_BASE } from "./aws-profile-dropdown";

export default function SSM() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const { data: parameters, error, isLoading, revalidate } = useCachedPromise(fetchParameters);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter parameters by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
      onSelectionChange={setSelectedItem}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        parameters?.map((parameter) => (
          <Parameter key={parameter.Name} parameter={parameter} isSelected={parameter.Name === selectedItem} />
        ))
      )}
    </List>
  );
}

function Parameter({ parameter, isSelected }: { parameter: ParameterMetadata; isSelected: boolean }) {
  const { data: parameterDetails } = useCachedPromise(fetchParameter, [isSelected ? parameter.Name : undefined]);

  return (
    <List.Item
      id={parameter.Name || ""}
      icon={Icon.Bookmark}
      title={parameter.Name || ""}
      subtitle={parameter.Version?.toString()}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Parameter"
            url={`${AWS_URL_BASE}/systems-manager/parameters/${parameter.Name}/description?region=${process.env.AWS_REGION}`}
          />
          <Action.CopyToClipboard title="Copy Value" content={parameterDetails?.Value || ""} />
          <Action.CopyToClipboard title="Copy Name" content={parameter.Name || ""} />
        </ActionPanel>
      }
      accessories={[
        { text: isSelected ? parameterDetails?.Value || "..." : parameter.DataType },
        { icon: isSelected ? Icon.Eye : Icon.EyeDisabled },
      ]}
    />
  );
}

async function fetchParameters(token?: string, accParameters?: ParameterMetadata[]): Promise<ParameterMetadata[]> {
  if (!process.env.AWS_PROFILE) return [];

  const { NextToken, Parameters } = await new SSMClient({}).send(new DescribeParametersCommand({ NextToken: token }));

  const combinedLogGroups = [...(accParameters || []), ...(Parameters || [])];

  if (NextToken) {
    return fetchParameters(NextToken, combinedLogGroups);
  }

  return combinedLogGroups;
}

async function fetchParameter(name?: string): Promise<Parameter | undefined> {
  if (!name) return;
  const { Parameter } = await new SSMClient({}).send(new GetParameterCommand({ Name: name, WithDecryption: true }));

  return Parameter;
}
