import { Icon, MenuBarExtra, open } from "@raycast/api";
import { readFileSync } from "fs";

interface WidgetSnapshot {
  todayWords: number;
  todayRecords: number;
  totalWords: number;
  streakDays: number;
  lastDictationPreview?: string;
  lastSyncDate: string;
}

function loadSnapshot(): WidgetSnapshot | null {
  try {
    const home = process.env.HOME ?? "";
    const path = `${home}/Library/Application Support/Uttero/widget-snapshot.json`;
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as WidgetSnapshot;
  } catch {
    return null;
  }
}

export default function MenuBarStatus() {
  const snap = loadSnapshot();

  if (!snap) {
    return (
      <MenuBarExtra icon={Icon.Microphone} title="–">
        <MenuBarExtra.Item title="Uttero is not running" />
        <MenuBarExtra.Item title="Open Uttero" onAction={() => open("uttero://settings")} />
      </MenuBarExtra>
    );
  }

  const title = `${snap.todayWords.toLocaleString()}w`;

  return (
    <MenuBarExtra icon={Icon.Microphone} title={title} tooltip={`${snap.todayWords} words today`}>
      <MenuBarExtra.Item
        title={`Today: ${snap.todayWords.toLocaleString()} words, ${snap.todayRecords} dictations`}
      />
      <MenuBarExtra.Item title={`Streak: ${snap.streakDays} days`} />
      {snap.lastDictationPreview && (
        <MenuBarExtra.Item title={`Last: ${snap.lastDictationPreview.slice(0, 60)}…`} />
      )}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Start Dictation"
        icon={Icon.Microphone}
        onAction={() => open("uttero://dictate")}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
      />
      <MenuBarExtra.Item
        title="Open Uttero Settings"
        icon={Icon.Gear}
        onAction={() => open("uttero://settings")}
      />
    </MenuBarExtra>
  );
}
