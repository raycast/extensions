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
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";

export default function SSM() {
  const [search, setSearch] = useState<string>("");
  const { data: parameters, error, isLoading, revalidate } = useCachedPromise(fetchParameters, [search]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter parameters by name..."
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
      id={parameter.Name || ""}
      icon={Icon.Bookmark}
      title={showValue ? parameterDetails?.Value || "" : parameter.Name || ""}
      actions={
        <ActionPanel>
          <Action title={showValue ? "Hide Value" : "Show Value"} onAction={() => setShowValue(!showValue)} />
          <Action.CopyToClipboard title="Copy Value" content={parameterDetails?.Value || ""} />
          <Action.OpenInBrowser
            title="Open Parameter"
            url={resourceToConsoleLink(parameter.Name, "AWS::SSM::Parameter")}
          />
          <Action.CopyToClipboard title="Copy Name" content={parameter.Name || ""} />
        </ActionPanel>
      }
      accessories={[{ icon: showValue ? Icon.Eye : Icon.EyeDisabled }]}
    />
  );
}

async function fetchParameters(
  search: string,
  token?: string,
  accParameters?: ParameterMetadata[]
): Promise<ParameterMetadata[]> {
  if (search.length < 4) return [];
  if (!process.env.AWS_PROFILE) return [];

  const { NextToken, Parameters } = await new SSMClient({}).send(
    new DescribeParametersCommand({
      NextToken: token,
      ParameterFilters: [{ Key: "Name", Option: "Contains", Values: [search] }],
    })
  );

  const combinedLogGroups = [...(accParameters || []), ...(Parameters || [])];

  if (NextToken) {
    return fetchParameters(search, NextToken, combinedLogGroups);
  }

  return combinedLogGroups;
}

async function fetchParameter(name?: string): Promise<Parameter | undefined> {
  if (!name) return;
  const { Parameter } = await new SSMClient({}).send(new GetParameterCommand({ Name: name, WithDecryption: true }));

  return Parameter;
}
