import { Icon, List } from "@raycast/api";
import useCoolify from "../use-coolify";
import { EnvironmentVariable, Resource } from "../types";

export default function EnvironmentVariables({ resource }: { resource: Resource }) {
  const { isLoading, data: envs = [] } = useCoolify<EnvironmentVariable[]>(`${resource.type}/${resource.uuid}/envs`);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search environment variable" isShowingDetail>
      <List.Section title={`${resource.name} / ENVs`} subtitle={`${envs.length} envs`}>
        {envs.map((env) => (
          <List.Item
            key={env.uuid}
            title={env.key}
            detail={
              <List.Item.Detail
                markdown={env.value}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Is Build Variable?"
                      icon={env.is_build_time ? Icon.Check : Icon.Xmark}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Is Literal?"
                      icon={env.is_literal ? Icon.Check : Icon.Xmark}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Is Multiline?"
                      icon={env.is_multiline ? Icon.Check : Icon.Xmark}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
