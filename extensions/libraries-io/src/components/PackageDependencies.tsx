import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useLibrariesDependencyDetail } from "../useLibrariesDependencyDetail";
import type { Package, Dependency } from ".././types";

interface Props {
  searchResult: Package;
}

export const PackageDependencies = ({ searchResult }: Props): JSX.Element => {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadDependencies = async () => {
    setLoading(true);
    const dependencyDetails = await useLibrariesDependencyDetail(searchResult.platform, searchResult.name);
    if (dependencyDetails?.dependencies) setDependencies(dependencyDetails.dependencies);
    setLoading(false);
  };

  useEffect(() => {
    loadDependencies();
  }, []);

  return (
    <List navigationTitle="Dependencies" isLoading={loading}>
      <List.Section title={searchResult.name} subtitle={searchResult.platform}>
        {dependencies.map(dependency => (
          <List.Item
            key={dependency.name}
            title={dependency.name}
            accessoryTitle={dependency.latest}
          />
        ))}
      </List.Section>
    </List>
  );
};
