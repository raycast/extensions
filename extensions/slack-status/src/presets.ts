import { environment } from "@raycast/api";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { useEffect, useState } from "react";
import { SlackStatusPreset } from "./types";

const DEFAULT_PAUSE_NOTIFICATIONS = false;
const DEFAULT_STATUS_DURATION = 120;

export const DEFAULT_PRESETS: SlackStatusPreset[] = [
  {
    title: "Focus Mode",
    emojiCode: ":technologist:",
    defaultDuration: DEFAULT_STATUS_DURATION,
    pauseNotifications: DEFAULT_PAUSE_NOTIFICATIONS,
  },
  {
    title: "In a Meeting",
    emojiCode: ":spiral_calendar_pad:",
    defaultDuration: 30,
    pauseNotifications: DEFAULT_PAUSE_NOTIFICATIONS,
  },
  {
    title: "Eating",
    emojiCode: ":hamburger:",
    defaultDuration: 60,
    pauseNotifications: DEFAULT_PAUSE_NOTIFICATIONS,
  },
  {
    title: "Coffee Break",
    emojiCode: ":coffee:",
    defaultDuration: 15,
    pauseNotifications: DEFAULT_PAUSE_NOTIFICATIONS,
  },
  {
    title: "AFK",
    emojiCode: ":walking:",
    defaultDuration: 0,
    pauseNotifications: DEFAULT_PAUSE_NOTIFICATIONS,
  },
];

function ensureDefaultValues(presets: SlackStatusPreset[]): SlackStatusPreset[] {
  return presets.map((preset) => {
    return {
      ...preset,
      pauseNotifications: preset.pauseNotifications ?? DEFAULT_PAUSE_NOTIFICATIONS,
    };
  });
}

function storePresets(presets: SlackStatusPreset[]) {
  try {
    mkdirSync(`${environment.supportPath}`, { recursive: true });
    const path = `${environment.supportPath}/presets.json`;
    writeFileSync(path, JSON.stringify(presets));
  } catch (e) {
    console.error(e);
  }
}

function readStoredPresets(): SlackStatusPreset[] | undefined {
  try {
    const path = `${environment.supportPath}/presets.json`;
    const contents = readFileSync(path);
    const serializedValue = contents.toString();
    return JSON.parse(serializedValue) as SlackStatusPreset[];
  } catch (e) {
    return undefined;
  }
}

export function usePresets() {
  const [presets, setPresets] = useState<SlackStatusPreset[]>(() => {
    const stored = readStoredPresets();
    if (stored) {
      return ensureDefaultValues(stored);
    } else {
      return DEFAULT_PRESETS;
    }
  });

  useEffect(() => {
    storePresets(presets);
  }, [presets]);

  return [presets, setPresets] as const;
}
