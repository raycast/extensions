import {
  ActionPanel,
  Action,
  List,
  LocalStorage,
  Icon,
  showHUD,
  popToRoot,
  environment,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";
import { readPidOrNull, stopHelper, startHelper, OVERRIDE_KEY } from "./helper";

interface LayoutEntry {
  stem: string;
  name: string;
  keyCount: number;
}

function loadLayouts(): LayoutEntry[] {
  const dir = path.join(environment.assetsPath, "layouts");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  return files
    .map((file) => {
      const stem = file.replace(/\.json$/, "");
      try {
        const parsed = JSON.parse(
          fs.readFileSync(path.join(dir, file), "utf8"),
        );
        return {
          stem,
          name: parsed.name ?? stem,
          keyCount: parsed.keys?.length ?? 0,
        };
      } catch {
        return { stem, name: stem, keyCount: 0 };
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const BUILT_IN = new Set(["ansi", "jis", "iso"]);

export default function Command() {
  const [layouts, setLayouts] = useState<LayoutEntry[]>([]);
  // undefined = not read from LocalStorage yet (avoid flashing the wrong
  // row's "Current" badge while that read is in flight). null = read
  // finished, no override saved, so open.tsx falls back to the Preferences
  // pane's Keyboard Layout setting. Distinct from the string "auto", which
  // is an override that was explicitly set to Auto-detect from this list.
  const [current, setCurrent] = useState<string | null | undefined>(undefined);
  const preferenceLayoutMode = getPreferenceValues<Preferences>().layoutMode;

  useEffect(() => {
    setLayouts(loadLayouts());
    LocalStorage.getItem<string>(OVERRIDE_KEY).then((v) =>
      setCurrent(v ?? null),
    );
  }, []);

  async function restart(stem: string, displayName: string) {
    // The helper only reads --layout-mode at startup, so if a window is
    // already open, changing the selection alone wouldn't do anything
    // until the user closed and reopened it by hand — restart it here
    // instead, reusing the same start/stop flow "Open KeyProbe" uses.
    const existingPid = readPidOrNull();
    if (existingPid !== null) {
      await stopHelper(existingPid);
      const result = await startHelper(stem);
      if (!result.success) {
        await showHUD(`⚠️ ${result.error}`);
        return;
      }
      await showHUD(`KeyProbe layout set: ${displayName} (restarted)`);
    } else {
      await showHUD(`KeyProbe layout set: ${displayName}`);
    }
    await popToRoot();
  }

  async function select(stem: string, displayName: string) {
    await LocalStorage.setItem(OVERRIDE_KEY, stem);
    await restart(stem, displayName);
  }

  const builtIns = layouts.filter((l) => BUILT_IN.has(l.stem));
  const custom = layouts.filter((l) => !BUILT_IN.has(l.stem));

  // The layoutMode preference stores a raw stem ("ansi", "jis", ...) or
  // "auto" — never a display name — so it needs resolving before it's
  // shown to a user, the same way built-in/custom List.Item titles already
  // use l.name instead of l.stem.
  const preferenceDisplayValue =
    preferenceLayoutMode === "auto"
      ? "Auto-detect"
      : (layouts.find((l) => l.stem === preferenceLayoutMode)?.name ??
        preferenceLayoutMode);

  async function useDefault() {
    await LocalStorage.removeItem(OVERRIDE_KEY);
    await restart(preferenceLayoutMode, preferenceDisplayValue);
  }

  return (
    <List searchBarPlaceholder="Search keyboard layouts...">
      <List.Section title="Built-in">
        <List.Item
          title="Use Preference Setting"
          subtitle={`Currently: ${preferenceDisplayValue}`}
          icon={Icon.ArrowCounterClockwise}
          accessories={current === null ? [{ text: "Current" }] : []}
          actions={
            <ActionPanel>
              <Action title="Use This" onAction={useDefault} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Auto-detect"
          subtitle="Auto-select based on the attached keyboard's hardware type"
          icon={Icon.MagnifyingGlass}
          accessories={current === "auto" ? [{ text: "Current" }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Use This"
                onAction={() => select("auto", "Auto-detect")}
              />
            </ActionPanel>
          }
        />
        {builtIns.map((l) => (
          <List.Item
            key={l.stem}
            title={l.name}
            subtitle={`${l.keyCount} keys`}
            icon={Icon.Keyboard}
            accessories={current === l.stem ? [{ text: "Current" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Use This"
                  onAction={() => select(l.stem, l.name)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Custom Keyboards">
        {custom.map((l) => (
          <List.Item
            key={l.stem}
            title={l.name}
            subtitle={`${l.keyCount} keys`}
            icon={Icon.Keyboard}
            accessories={current === l.stem ? [{ text: "Current" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Use This"
                  onAction={() => select(l.stem, l.name)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
