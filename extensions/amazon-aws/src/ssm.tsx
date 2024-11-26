import {
  DescribeParametersCommand,
  GetParameterCommand,
  Parameter as SSMParameter,
  ParameterMetadata,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { isReadyToFetch, resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";

export default function SSM() {
  const [search, setSearch] = useState<string>("");
  const [threshold, setThreshold] = useState<number>(4);
  const { data: parameters, error, isLoading, revalidate } = useCachedPromise(fetchParameters, [search, threshold]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter parameters by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
      onSearchTextChange={setSearch}
      throttle
      actions={
        <ActionPanel>
          <Action title="Show All" onAction={() => setThreshold(0)} />
        </ActionPanel>
      }
    >
      {search.length < threshold ? (
        <List.EmptyView
          title="Missing Search Query"
          icon={Icon.MagnifyingGlass}
          description={`The search will begin when at least ${threshold} characters are provided.`}
        />
      ) : error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        parameters?.map((parameter) => <Parameter key={parameter.Name} parameter={parameter} />)
      )}
    </List>
  );
}

function Parameter({ parameter }: { parameter: ParameterMetadata }) {
  const [showValue, setShowValue] = useState<boolean>(false);
  const { data: parameterDetails } = useCachedPromise(fetchParameter, [parameter.Name]);

  return (
    <List.Item
      key={parameter.Name}
      icon={Icon.Bookmark}
      title={showValue ? parameterDetails?.Value || "" : parameter.Name || ""}
      actions={
        <ActionPanel>
          <Action title={showValue ? "Hide Value" : "Show Value"} onAction={() => setShowValue(!showValue)} />
          <Action.CopyToClipboard title="Copy Value" content={parameterDetails?.Value || ""} />
          <AwsAction.Console url={resourceToConsoleLink(parameter.Name, "AWS::SSM::Parameter")} />
          <Action.CopyToClipboard title="Copy Name" content={parameter.Name || ""} />
        </ActionPanel>
      }
      accessories={[{ icon: showValue ? Icon.Eye : Icon.EyeDisabled }]}
    />
  );
}

async function fetchParameters(
  search: string,
  threshold: number,
  token?: string,
  accParameters?: ParameterMetadata[],
): Promise<ParameterMetadata[]> {
  if (search.length < threshold) return [];
  if (!isReadyToFetch()) return [];

  const { NextToken, Parameters } = await new SSMClient({}).send(
    new DescribeParametersCommand({
      NextToken: token,
      ParameterFilters: search ? [{ Key: "Name", Option: "Contains", Values: [search] }] : undefined,
    }),
  );

  const combinedLogGroups = [...(accParameters || []), ...(Parameters || [])];

  if (NextToken) {
    return fetchParameters(search, threshold, NextToken, combinedLogGroups);
  }

  return combinedLogGroups;
}

async function fetchParameter(name?: string): Promise<SSMParameter | undefined> {
  if (!name) return;
  const { Parameter } = await new SSMClient({}).send(new GetParameterCommand({ Name: name, WithDecryption: true }));

  return Parameter;
}
