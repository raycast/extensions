import { getPreferenceValues } from "@raycast/api";
import { PondClient } from "./client";

export function pondClient(): PondClient {
  return new PondClient(getPreferenceValues<Preferences>());
}
