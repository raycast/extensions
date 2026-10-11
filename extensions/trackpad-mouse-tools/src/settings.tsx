import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, open } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  choiceTitle,
  readAll,
  resetAll,
  SECTION_TITLES,
  SectionId,
  Setting,
  SETTINGS,
  setSetting,
} from "./lib/trackpad";
import { confirmChange, reportError } from "./lib/feedback";

const ICONS: Record<string, Icon> = {
  rightClick: Icon.Mouse,
  tapToClick: Icon.Fingerprint,
  lookup: Icon.MagnifyingGlass,
  clickPressure: Icon.Gauge,
  trackingSpeed: Icon.Gauge,
  forceClick: Icon.Bolt,
  naturalScrolling: Icon.ArrowsExpand,
  pinchZoom: Icon.MagnifyingGlass,
  smartZoom: Icon.Maximize,
  rotate: Icon.RotateClockwise,
  swipePages: Icon.ArrowLeft,
  swipeSpaces: Icon.AppWindowSidebarLeft,
  missionControl: Icon.AppWindowGrid3x3,
  appExpose: Icon.AppWindowList,
  notificationCenter: Icon.Bell,
  showDesktop: Icon.Desktop,
  dragStyle: Icon.Move,
  mouseSpeed: Icon.Gauge,
  mouseScrollSpeed: Icon.ArrowsExpand,
  doubleClickSpeed: Icon.Stopwatch,
  pointerAcceleration: Icon.Bolt,
  magicMouseSecondaryClick: Icon.Mouse,
};

export default function Command() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setValues(await readAll());
    } catch (e) {
      await reportError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const apply = async (label: string, fn: () => Promise<boolean>) => {
    try {
      await confirmChange(label, await fn());
    } catch (e) {
      await reportError(e);
    }
    await reload();
  };

  const change = (s: Setting, value: string) => () =>
    apply(`${s.title}: ${choiceTitle(s, value)}`, () => setSetting(s, value));

  const reset = async () => {
    const ok = await confirmAlert({
      title: "Reset All Trackpad Settings?",
      message: "Restores every setting listed here to the macOS default.",
      primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
    });
    if (ok) await apply("Restored macOS defaults", resetAll);
  };

  const common = (
    <ActionPanel.Section>
      <Action
        title="Open System Settings"
        icon={Icon.Gear}
        shortcut={Keyboard.Shortcut.Common.Open}
        onAction={() => open("x-apple.systempreferences:com.apple.Trackpad-Settings.extension")}
      />
      <Action title="Reload" icon={Icon.ArrowClockwise} shortcut={Keyboard.Shortcut.Common.Refresh} onAction={reload} />
      <Action
        title="Reset All to Defaults"
        icon={Icon.Undo}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
        onAction={reset}
      />
    </ActionPanel.Section>
  );

  const actionsFor = (s: Setting) => {
    const current = values[s.id];
    const idx = s.choices.findIndex((c) => c.value === current);

    if (s.kind === "bool") {
      const next = current === "on" ? "off" : "on";
      return (
        <ActionPanel>
          <Action
            title={next === "on" ? "Enable" : "Disable"}
            icon={next === "on" ? Icon.CheckCircle : Icon.XMarkCircle}
            onAction={change(s, next)}
          />
          {common}
        </ActionPanel>
      );
    }

    if (s.kind === "stepper") {
      const up = s.choices[Math.min(idx + 1, s.choices.length - 1)];
      const down = s.choices[Math.max(idx - 1, 0)];
      return (
        <ActionPanel>
          <Action
            title="Faster"
            icon={Icon.ChevronUp}
            shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
            onAction={change(s, up.value)}
          />
          <Action
            title="Slower"
            icon={Icon.ChevronDown}
            shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
            onAction={change(s, down.value)}
          />
          {common}
        </ActionPanel>
      );
    }

    // choice: Enter moves to the next option, ⌘K lists all of them
    const next = s.choices[(idx + 1) % s.choices.length];
    return (
      <ActionPanel>
        <Action title="Next Option" icon={Icon.ArrowRight} onAction={change(s, next.value)} />
        <ActionPanel.Section title={s.title}>
          {s.choices.map((c) => (
            <Action
              key={c.value}
              title={c.title}
              icon={c.value === current ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
              onAction={change(s, c.value)}
            />
          ))}
        </ActionPanel.Section>
        {common}
      </ActionPanel>
    );
  };

  const accessory = (s: Setting): List.Item.Accessory[] => {
    const v = values[s.id];
    if (v === undefined) return [];
    if (s.kind === "bool") {
      return [{ tag: { value: v === "on" ? "On" : "Off", color: v === "on" ? Color.Green : Color.SecondaryText } }];
    }
    return [{ tag: { value: choiceTitle(s, v), color: v === "off" ? Color.SecondaryText : Color.Blue } }];
  };

  const sections = Object.keys(SECTION_TITLES) as SectionId[];
  return (
    <List isLoading={loading} navigationTitle="Trackpad & Mouse" searchBarPlaceholder="Search settings…">
      {sections.map((sec) => (
        <List.Section key={sec} title={SECTION_TITLES[sec]}>
          {SETTINGS.filter((s) => s.section === sec).map((s) => (
            <List.Item
              key={s.id}
              title={s.title}
              subtitle={s.subtitle}
              icon={ICONS[s.id] ?? Icon.Dot}
              keywords={s.choices.map((c) => c.title)}
              accessories={accessory(s)}
              actions={actionsFor(s)}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
