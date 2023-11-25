import { environment } from "@raycast/api";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { useEffect, useState } from "react";
import { SlackStatusPreset } from "./types";

export const DEFAULT_PRESETS: SlackStatusPreset[] = [
  {
    title: "Focus Mode",
    emojiCode: ":technologist:",
    defaultDuration: 120,
  },
  {
    title: "In a Meeting",
    emojiCode: ":spiral_calendar_pad:",
    defaultDuration: 30,
  },
  {
    title: "Eating",
    emojiCode: ":hamburger:",
    defaultDuration: 60,
  },
  {
    title: "Coffee Break",
    emojiCode: ":coffee:",
    defaultDuration: 15,
  },
  {
    title: "AFK",
    emojiCode: ":walking:",
    defaultDuration: 0,
  },
];

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
      return stored;
    } else {
      return DEFAULT_PRESETS;
    }
  });

  useEffect(() => {
    storePresets(presets);
  }, [presets]);

  return [presets, setPresets] as const;
}
