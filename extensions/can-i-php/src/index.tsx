import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import { Feature } from "./lib/types/feature";
import { FeatureSingle } from "./lib/components/FeatureSingle";
import { featureSupportedIn } from "./lib/util/featureSupportedIn";
import { getPreferredVersions } from "./lib/util/versions";
import { useFetch } from "@raycast/utils";
import { Accessory } from "./lib/types/accessory";
import { featureSupportedInAny } from "./lib/util/featureSupportedInAny";

const versions = getPreferredVersions();

function getAccessories(feature: Feature) {
  const accessories: Accessory[] = [];

  versions.forEach((version) => {
    if (featureSupportedIn(feature, version)) {
      accessories.push({ text: { value: version, color: Color.Green } });
    } else {
      accessories.push({ text: { value: version, color: Color.SecondaryText } });
    }
  });

  return accessories;
}

export default function Command() {
  const { isLoading, data: features } = useFetch<Feature[]>("https://caniphp.com/features.json", {
    keepPreviousData: true,
    parseResponse: async (response) => response.json() as Promise<Feature[]>,
    mapResult: (featureList) => ({
      data: featureList.filter((phpFeature) => featureSupportedInAny(phpFeature, versions)),
    }),
  });

  return (
    <List isLoading={isLoading}>
      {features?.map((phpFeature: Feature) => (
        <List.Item
          key={phpFeature.name}
          title={phpFeature.name}
          accessories={getAccessories(phpFeature)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Details"
                icon={Icon.Binoculars}
                target={<FeatureSingle feature={phpFeature} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
