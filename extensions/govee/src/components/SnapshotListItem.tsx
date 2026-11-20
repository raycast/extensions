import type { ReactNode } from "react";

import { Action, ActionPanel, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";

import type { CloudDevice } from "@/lib/cloud";

import type { SnapshotColors } from "@/hooks/useSnapshotColors";

import SetColorGrid from "@/components/SetColorGrid";

export type SnapshotRow = { id: string; name: string; value: number; device: CloudDevice; deviceName: string };

// Self-contained (no device list needed), so the quicklink can apply it straight away.
const snapshotQuicklink = ({ device, value, name }: SnapshotRow) => {
  const context = JSON.stringify({ snapshot: { sku: device.model, device: device.id, value, name } });
  return `${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/j3lte/govee/control-govee-lights?context=${encodeURIComponent(context)}`;
};

/** A snapshot saved in the Govee app. Applied through the cloud, even for lights controlled over LAN. */
const SnapshotListItem = ({
  snapshot,
  colorStore,
  layoutActions,
}: {
  snapshot: SnapshotRow;
  colorStore: SnapshotColors;
  layoutActions?: ReactNode;
}) => {
  const { colors, custom } = colorStore.colorsFor(snapshot.id, snapshot.name);

  const apply = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Applying ${snapshot.name}…` });
    try {
      await snapshot.device.applySnapshot(snapshot.value);
      toast.style = Toast.Style.Success;
      toast.title = `${snapshot.name} applied`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't apply snapshot";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  };

  return (
    <List.Item
      title={snapshot.name}
      icon={Icon.Camera}
      keywords={[snapshot.deviceName]}
      accessories={[
        ...colors.map((c) => ({
          icon: { source: "circle.svg", tintColor: c },
          tooltip: custom ? "Custom color tag" : "Color guessed from the snapshot name",
        })),
        { tag: snapshot.deviceName, tooltip: "Snapshot for this device" },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Snapshot">
            <Action title="Apply Snapshot" icon={Icon.Play} onAction={apply} />
            <Action.Push
              title="Set Custom Color Tag"
              icon={Icon.EyeDropper}
              shortcut={{ key: "c", modifiers: ["cmd", "opt"] }}
              target={
                <SetColorGrid
                  multiple={{ initial: colors, onSave: (hexes) => colorStore.setColors(snapshot.id, hexes) }}
                />
              }
            />
            {custom ? (
              <Action
                title="Reset Custom Color Tag"
                icon={Icon.ArrowCounterClockwise}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => colorStore.resetColor(snapshot.id)}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Quicklink">
            <Action.CreateQuicklink
              title="Create Quicklink"
              quicklink={{ name: `Govee: ${snapshot.name}`, link: snapshotQuicklink(snapshot) }}
              shortcut={{ key: "l", modifiers: ["cmd", "shift"] }}
            />
          </ActionPanel.Section>
          {layoutActions}
        </ActionPanel>
      }
    />
  );
};

export default SnapshotListItem;
