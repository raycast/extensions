import { getPreferenceValues } from "@raycast/api";
import { Effect } from "effect";

export type PreferencesType = {
  accessTokenId: string;
  secretKey: string;
  organizationId: string;
  environmentId: string;
};

export class Preferences extends Effect.Service<Preferences>()("PreferencesService", {
  sync: getPreferenceValues<PreferencesType>,
}) {}
