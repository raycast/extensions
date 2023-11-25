import React, { useState, useEffect } from "react";
import { List } from "@raycast/api";
import { EnvironmentDropdown, FeatureListItem } from "./components";
import { useGrowthbook } from "./hooks";

export default function Command() {
  const { data, isLoading } = useGrowthbook();
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(null);

  const environments = data?.features?.[0]?.environments ? Object.keys(data.features[0].environments) : [];

  useEffect(() => {
    if (!selectedEnvironment && environments.length > 0) {
      setSelectedEnvironment(environments[0]);
    }
  }, [selectedEnvironment, environments]);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={<EnvironmentDropdown environments={environments} onChange={setSelectedEnvironment} />}
    >
      {data?.features?.map((feature, index) => (
        <FeatureListItem key={index} feature={feature} selectedEnvironment={selectedEnvironment} />
      ))}
    </List>
  );
}
