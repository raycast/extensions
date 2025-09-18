import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  LocalStorage,
  updateCommandMetadata,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback } from "react";

const REGIONS = [
  { id: "us-central1", name: "US Central", url: "https://dust.tt" },
  { id: "europe-west1", name: "Europe West", url: "https://eu.dust.tt" },
] as const;

type RegionType = (typeof REGIONS)[number];

export default function PickRegionCommand() {
  const navigation = useNavigation();

  const { data: selectedRegion, isLoading } = usePromise(async () => {
    const stored = await LocalStorage.getItem<string>("selectedRegion");
    return stored || "us-central1";
  }, []);

  const setRegion = useCallback(
    async (region: RegionType) => {
      updateCommandMetadata({ subtitle: `Currently using: "${region.name}"` });
      await LocalStorage.setItem("selectedRegion", region.id);
      await LocalStorage.setItem("dustApiUrl", region.url);
      navigation.pop();
    },
    [navigation],
  );

  return (
    <List isLoading={isLoading} selectedItemId={selectedRegion}>
      <List.Section title="Select your preferred Dust region:">
        {REGIONS.map((region) => (
          <List.Item
            key={region.id}
            id={region.id}
            title={region.name}
            subtitle={region.url}
            accessories={[
              {
                tag: { value: region.id, color: Color.Blue },
                icon: selectedRegion === region.id ? { source: Icon.Check } : null,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Select"
                  icon={Icon.Check}
                  shortcut={{ key: "return", modifiers: [] }}
                  onAction={() => setRegion(region)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
