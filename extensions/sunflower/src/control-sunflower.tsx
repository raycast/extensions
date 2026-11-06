import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { formatBytes, listVolumes, VolumeUsage } from "./lib/volumes";
import { actions, MenuAction } from "./lib/actions";
import { errorMessage, performAction } from "./lib/sunflower";

const categories = ["Views", "Scan", "Navigation", "Selected Item"] as const;
const categoryIcons = {
  Views: Icon.AppWindow,
  Scan: Icon.ArrowClockwise,
  Navigation: Icon.Folder,
  "Selected Item": Icon.Document,
};

export default function Command() {
  const [busy, setBusy] = useState(false);
  const [volumes, setVolumes] = useState<VolumeUsage[]>([]);
  useEffect(() => {
    void listVolumes().then(setVolumes);
  }, []);

  async function run(action: MenuAction) {
    if (busy) return;
    setBusy(true);
    try {
      await performAction(action);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not control Sunflower",
        message: errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <List
      isLoading={busy}
      searchBarPlaceholder="Switch views, navigate, or rescan…"
    >
      {volumes.length ? (
        <List.Section title="Disks">
          {volumes.map((volume) => {
            const percent = Math.round(volume.fraction * 100);
            const color =
              percent >= 90
                ? Color.Red
                : percent >= 75
                  ? Color.Orange
                  : Color.Green;
            return (
              <List.Item
                key={volume.path}
                title={volume.name}
                subtitle={`${formatBytes(volume.free)} free of ${formatBytes(volume.total)}`}
                icon={{ source: Icon.HardDrive, tintColor: color }}
                accessories={[{ tag: { value: `${percent}% used`, color } }]}
                actions={
                  <ActionPanel>
                    <Action.ShowInFinder path={volume.path} />
                    <Action
                      title="Refresh Disk Usage"
                      icon={Icon.ArrowClockwise}
                      onAction={() => void listVolumes().then(setVolumes)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}
      {categories.map((category) => (
        <List.Section key={category} title={category}>
          {actions
            .filter((action) => action.category === category)
            .map((action) => (
              <List.Item
                key={action.id}
                title={action.title}
                subtitle={action.description}
                icon={categoryIcons[category]}
                actions={
                  <ActionPanel>
                    <Action
                      title={action.title}
                      icon={categoryIcons[category]}
                      onAction={() => run(action)}
                    />
                    <Action.OpenInBrowser
                      title="Sunflower Help"
                      url="https://sunflower.karakabakov.com/support/"
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
