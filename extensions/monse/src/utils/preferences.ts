import { getPreferenceValues } from "@raycast/api";
import { Currency } from "./types";

interface Preferences {
  token: string;
  currency: Currency;
}

export const preferences = getPreferenceValues<Preferences>();
