import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { runMirrorAction, MirrorDirection } from "./lib/mirror";

export default function Command() {
  const { defaultToggleDirection } = getPreferenceValues<{ defaultToggleDirection: MirrorDirection }>();

  return (
    <List isLoading={false}>
      <List.Item
        icon={Icon.Desktop}
        title="Mac → External"
        subtitle="Mirror the Mac's main display onto the primary external display (uses first external when multiple connected)"
        actions={
          <ActionPanel>
            <Action title="Mirror Mac to External" icon={Icon.Desktop} onAction={() => runMirrorAction("mac")} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Monitor}
        title="External → Mac"
        subtitle="Mirror the primary external display onto the Mac's main display (uses first external when multiple connected)"
        actions={
          <ActionPanel>
            <Action title="Mirror External to Mac" icon={Icon.Monitor} onAction={() => runMirrorAction("external")} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.XMarkCircle}
        title="Turn Off Mirroring"
        subtitle="Stop mirroring and use displays separately (Extended) — applies to all displays"
        actions={
          <ActionPanel>
            <Action title="Disable Mirroring" icon={Icon.XMarkCircle} onAction={() => runMirrorAction("off")} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Repeat}
        title="Toggle Mirroring"
        subtitle={`Turn mirroring off if it's on, or on (${defaultToggleDirection === "external" ? "External → Mac" : "Mac → External"}) if it's off`}
        actions={
          <ActionPanel>
            <Action
              title="Toggle Mirroring"
              icon={Icon.Repeat}
              onAction={() => runMirrorAction("toggle", defaultToggleDirection)}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
