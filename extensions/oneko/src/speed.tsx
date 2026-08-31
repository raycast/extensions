import { Action, ActionPanel, Icon, List, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { readSetting, requireOneko, send } from "./oneko";

// Mirrors AppDelegate.speeds; the URL takes the lowercased name.
const SPEEDS = [
  { name: "Slow", value: "5" },
  { name: "Normal", value: "10" },
  { name: "Fast", value: "20" },
];

export default function Command() {
  const { data: current } = useCachedPromise(async () => {
    const value = await readSetting("catSpeed");
    return value ? String(parseFloat(value)) : "10";
  });

  async function choose(speed: { name: string; value: string }) {
    if (!(await requireOneko())) return;
    if (!(await send(`speed/${speed.name.toLowerCase()}`))) return;
    await showHUD(`Speed: ${speed.name}`);
  }

  return (
    <List searchBarPlaceholder="Search speeds…">
      <List.EmptyView icon={Icon.Gauge} title="No Matching Speeds" description="Try Slow, Normal, or Fast." />
      {SPEEDS.map((speed) => (
        <List.Item
          key={speed.value}
          title={speed.name}
          icon={speed.value === current ? Icon.CheckCircle : Icon.Circle}
          actions={
            <ActionPanel>
              <Action icon={Icon.Gauge} title="Set Speed" onAction={() => choose(speed)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
