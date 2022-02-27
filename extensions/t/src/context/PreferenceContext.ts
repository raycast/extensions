import { createContext } from "react";
import { getPreferenceValues } from "@raycast/api";

export const PreferenceContext = createContext(getPreferenceValues<Preference>());

export type Preference = {
  source: string;
  target: string;
};
