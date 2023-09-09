import { environment } from "@raycast/api";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { useEffect, useState } from "react";
import { DEFAULT_STATUSES } from "./defaultStatuses";
import { SlackStatusPreset } from "./interfaces";

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
      return DEFAULT_STATUSES;
    }
  });

  useEffect(() => {
    storePresets(presets);
  }, [presets]);

  return [presets, setPresets] as const;
}
