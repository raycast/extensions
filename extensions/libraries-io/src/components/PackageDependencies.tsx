import { Icon, List } from "@raycast/api";
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
                  icon: dependency.kind === "runtime" ? Icon.Cog : Icon.Hammer,
                  tooltip: dependency.kind,
                },
              ]}
            />
          ))}
      </List.Section>
    </List>
  );
};
