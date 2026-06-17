import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import {
  checkSystemUpdates,
  openSoftwareUpdate,
  SystemUpdate,
} from "../utils/sources/system-updates";

/**
 * The "macOS" section of the Updates view — pending OS / Safari / security
 * updates. We surface and hand off to System Settings to apply (OS installs are
 * large, restart-prone, and need root, so we never run them silently).
 */
export default function SystemUpdatesSection({
  updates,
  onRefresh,
}: {
  updates: SystemUpdate[];
  onRefresh: (u: SystemUpdate[]) => void;
}) {
  if (updates.length === 0) return null;
  return (
    <List.Section title="macOS" subtitle={`${updates.length}`}>
      {updates.map((u) => {
        const size =
          u.sizeMB && u.sizeMB >= 1024
            ? `${(u.sizeMB / 1024).toFixed(1)} GB`
            : u.sizeMB
              ? `${u.sizeMB} MB`
              : undefined;
        const accessories: List.Item.Accessory[] = [];
        if (u.restart)
          accessories.push({
            tag: { value: "restart", color: Color.Orange },
            tooltip: "Requires a restart",
          });
        if (size) accessories.push({ text: size });
        accessories.push({ tag: { value: "⏎", color: Color.Blue } });
        return (
          <List.Item
            key={u.label}
            icon={{ source: Icon.Desktop, tintColor: Color.Blue }}
            title={u.title}
            subtitle={u.version ? `Version ${u.version}` : undefined}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action
                  title="Open Software Update"
                  icon={Icon.Gear}
                  onAction={openSoftwareUpdate}
                />
                <Action
                  title="Re-check macOS Updates"
                  icon={Icon.RotateClockwise}
                  onAction={() =>
                    checkSystemUpdates({ force: true }).then(onRefresh)
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}
