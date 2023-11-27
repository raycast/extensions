import { ActionPanel, List, Action, useNavigation } from "@raycast/api";
import { ArtifactList } from "./artifactsList";
import { DeviceInfoDetails } from "./deviceInfo";

export default function Command() {
  const { push } = useNavigation();
  return (
    <List navigationTitle="Select app type to install">
      <List.Item
        icon="nt-dev.png"
        title="Feature"
        actions={
          <ActionPanel>
            <Action
              title="View Builds"
              onAction={() => push(<ArtifactList appType="feature" packageName="no.norsktipping.android.feature" />)}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon="nt-logo.png"
        title="Main"
        actions={
          <ActionPanel>
            <Action
              title="View Builds"
              onAction={() => push(<ArtifactList appType="main" packageName="no.norsktipping.android" />)}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon="maestro.png"
        title="Maestro"
        actions={
          <ActionPanel>
            <Action
              title="View Builds"
              onAction={() => push(<ArtifactList appType="maestro" packageName="no.norsktipping.android.maestro.debug" />)}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon="list-icon.png"
        title="Device info"
        actions={
          <ActionPanel>
            <Action
              title="Show Details"
              onAction={() => push(<DeviceInfoDetails />)}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
