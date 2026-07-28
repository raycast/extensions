import { Action, ActionPanel, Icon, List, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { readSetting, requireOneko, send } from "./oneko";

// Mirrors AppDelegate.speeds; the URL takes the lowercased name.
const SPEEDS = [
  { name: "Slow", value: "5" },
  { name: "Normal", value: "10" },
  { name: "Fast", value: "20" },
];

export default function Command() {
  const [current, setCurrent] = useState<string>();

  useEffect(() => {
    // catSpeed is stored as a float; absent means the Normal default.
    readSetting("catSpeed").then((value) => setCurrent(value ? String(parseFloat(value)) : "10"));
  }, []);

  async function choose(speed: { name: string; value: string }) {
    if (!(await requireOneko())) return;
    await send(`speed/${speed.name.toLowerCase()}`);
    await showHUD(`Speed: ${speed.name}`);
  }

  return (
    <List>
      {SPEEDS.map((speed) => (
        <List.Item
          key={speed.value}
          title={speed.name}
          icon={speed.value === current ? Icon.CheckCircle : Icon.Circle}
          actions={
            <ActionPanel>
              <Action title="Set Speed" onAction={() => choose(speed)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
