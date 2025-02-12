import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import { Feature } from "./lib/types/feature";
import { FeatureSingle } from "./lib/components/FeatureSingle";
import { featureSupportedIn } from "./lib/util/featureSupportedIn";
import { getVersions } from "./lib/util/versions";
import { useFetch } from "@raycast/utils";
import { Accessory } from "./lib/types/accessory";

const versions = getVersions();

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
  const { isLoading, data } = useFetch("https://caniphp.com/features.json");
  return (
    <List isLoading={isLoading}>
      {Array.isArray(data) &&
        data.map((phpFeature, index) => (
          <List.Item
            key={index}
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
