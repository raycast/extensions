import { getPreferenceValues } from "@raycast/api";
import { Settings, settingsFromRaw } from "./core/settings";

/**
 * The single place preferences are read. `getPreferenceValues` is constant per
 * process, so it happens once at module load; the mapping itself is pure and
 * lives in the core.
 *
 * No cast: the generated `Preferences` type is structurally assignable to
 * `RawSettings`, so renaming a preference in the manifest is a compile error.
 * A cast would hide that.
 */
export const settings: Settings = settingsFromRaw(getPreferenceValues<Preferences>());
