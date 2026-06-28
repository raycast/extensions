import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { GrowthbookResponse } from "../types";

export function FeatureListItem({
  feature,
  selectedEnvironment,
}: {
  feature: GrowthbookResponse["features"][0];
  selectedEnvironment: string | null;
}) {
  const isEnabled = feature.environments[selectedEnvironment || ""]?.enabled;

  const tags = feature.tags.map((tag) => ({
    tag,
    icon: Icon.Tag,
  }));

  return (
    <List.Item
      key={feature.id}
      icon={
        isEnabled
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.XMarkCircle, tintColor: Color.Red }
      }
      title={feature.id.toUpperCase()}
      accessories={tags}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://app.growthbook.io/features/${feature.id}`} />
        </ActionPanel>
      }
    />
  );
}
