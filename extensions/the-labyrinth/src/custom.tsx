import { getPreferenceValues } from "@raycast/api";
import MazeCommand from "./maze";
import type { CustomSetup } from "./maze/types";

function parseLevel(value: string): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(99, n);
}

export default function CustomLabyrinth() {
  const prefs = getPreferenceValues<Preferences.Custom>();
  const custom: CustomSetup = {
    level: parseLevel(prefs.level),
    key: prefs.key,
    ghost: prefs.ghost,
    portals: prefs.portals,
    fog: prefs.fog,
    ice: prefs.ice,
    shifting: prefs.shifting,
    footprints: prefs.footprints,
  };
  return <MazeCommand custom={custom} />;
}
