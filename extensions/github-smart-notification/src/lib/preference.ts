import { getPreferenceValues } from "@raycast/api";

interface Preference {
  ghCommandPath: string;
  autoReadMergedPr: boolean;
}

const preference = getPreferenceValues<Preference>();

export const ghCommandPath = preference.ghCommandPath;
export const autoReadMergedPr = preference.autoReadMergedPr;
