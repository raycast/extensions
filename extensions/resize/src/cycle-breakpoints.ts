import { getPreferenceValues, LocalStorage, showHUD } from "@raycast/api";
import { loadPresets } from "./presets";
import { applyAndNotify } from "./resize";

const KEY_INDEX = "cycle-index";
const KEY_TIME = "cycle-time";
const RESET_AFTER_MS = 60_000;

export default async function Command() {
  const { presets, fileCycle } = loadPresets();
  const prefs = getPreferenceValues<{ cycle1?: string; cycle2?: string; cycle3?: string }>();

  // A cycle array in ~/.config/resize/presets.json overrides the settings slots
  // (the only way to get >3 steps or custom presets into the rotation).
  const ids =
    fileCycle ??
    [prefs.cycle1, prefs.cycle2, prefs.cycle3].filter((v): v is string => !!v && v !== "none");

  const sequence = ids
    .map((id) => presets.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  if (sequence.length === 0) {
    await showHUD("Cycle is empty — pick presets in the extension settings (⌘⇧,)");
    return;
  }

  const last = Number((await LocalStorage.getItem<string>(KEY_TIME)) ?? 0);
  let index = Number((await LocalStorage.getItem<string>(KEY_INDEX)) ?? 0);
  if (Date.now() - last > RESET_AFTER_MS) index = 0;
  index %= sequence.length;

  await applyAndNotify(sequence[index], `${index + 1}/${sequence.length} · `);

  await LocalStorage.setItem(KEY_INDEX, String(index + 1));
  await LocalStorage.setItem(KEY_TIME, String(Date.now()));
}
