import { Action, ActionPanel, Color, environment, Icon, List, showHUD, showToast, Toast } from "@raycast/api";
import { join } from "node:path";
import { patchFinicky, status } from "./lib/config";
import { ChooserMode } from "./lib/entry";
import { restartFinicky } from "./lib/finicky-app";

const MODES: { mode: ChooserMode; title: string; subtitle: string; icon: Icon }[] = [
  {
    mode: "always",
    title: "Open the chooser for every unmatched link",
    subtitle: "Anything your rules don't route asks you",
    icon: Icon.List,
  },
  {
    mode: "fn",
    title: "Open the chooser only while fn is held",
    subtitle: "A plain click goes to the default browser",
    icon: Icon.Keyboard,
  },
];

export default function Patch() {
  const { patched, mode: current, originalPath } = status();
  const title = patched
    ? `Patched · your config: ${originalPath ?? "?"}`
    : `Not patched · ${originalPath ?? "no Finicky config found"}`;

  return (
    <List navigationTitle="Patch Finicky Config" searchBarPlaceholder="What happens to a link no handler routes?">
      <List.Section title={title}>
        {MODES.map(({ mode, title, subtitle, icon }) => (
          <List.Item
            key={mode}
            icon={icon}
            title={title}
            subtitle={subtitle}
            accessories={patched && current === mode ? [{ tag: { value: "current", color: Color.Green } }] : []}
            actions={
              <ActionPanel>
                <Action title="Patch Config" icon={Icon.Pencil} onAction={() => patch(mode)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

async function patch(mode: ChooserMode): Promise<void> {
  try {
    const outcome = patchFinicky(join(environment.assetsPath, "finickizer.js"), mode);
    if (outcome.restartFinicky) await restartFinicky();
    const changes = [...outcome.changes, ...(outcome.restartFinicky ? ["restarted Finicky"] : [])];
    await showHUD(
      changes.length ? `Finicky config patched: ${changes.join(", ")}` : "Already patched, Finicky reloaded",
    );
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Could not patch Finicky config", message: String(error) });
  }
}
