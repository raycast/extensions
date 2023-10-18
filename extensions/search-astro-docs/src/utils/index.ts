import { Preferences } from "../types/types";
import { getPreferenceValues } from "@raycast/api";

export const preferences = getPreferenceValues<Preferences>();
