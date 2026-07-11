import { getPreferenceValues } from "@raycast/api";
import { Effect } from "effect";

export class Preferences extends Effect.Service<Preferences>()("PreferencesService", {
  sync: getPreferenceValues,
}) {}
