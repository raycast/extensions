import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { Package, DependenciesResponse } from ".././types";

interface Props {
  searchResult: Package;
}

export const PackageDependencies = ({ searchResult }: Props): JSX.Element => {
  const { data, isLoading } = useFetch<DependenciesResponse>(
    `https://libraries.io/api/${searchResult.platform}/${searchResult.name}/latest/dependencies`
  );

  return (
    <List navigationTitle="Dependencies" isLoading={isLoading}>
      <List.Section title={searchResult.name} subtitle={searchResult.platform}>
        {data?.dependencies
          .sort((a, b) => a.name.localeCompare(b.name))
          .sort((a, b) => b.kind.localeCompare(a.kind))
          .map((dependency) => (
            <List.Item
              key={dependency.name}
              title={dependency.name}
              icon={Icon.Box}
              accessories={[
                {
                  text: dependency.requirements,
                  tooltip: "Version Requirement",
                },
                {
                  icon: dependency.deprecated || dependency.outdated ? Icon.Warning : null,
                  tooltip: dependency.deprecated
                    ? "This package has been marked as deprecated"
                    : dependency.outdated
                    ? "Out of date version"
                    : null,
                },
                {
                  icon: dependency.kind === "runtime" ? Icon.Cog : Icon.Hammer,
                  tooltip: `Dependency Type: ${dependency.kind}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content={dependency.name}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                    title="Copy Package Name"
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
};
