// Declared here rather than taken from the generated raycast-env.d.ts, so the
// module typechecks before the first `ray build`.

import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  defaultView: "tree" | "prose";
  markdownTemplate: string;
  showEtymonline: boolean;
}

const DEFAULTS: Preferences = {
  defaultView: "tree",
  markdownTemplate: "## {term}\n\n{chain}\n\n{prose}\n\n{attribution}",
  showEtymonline: true,
};

export function preferences(): Preferences {
  return { ...DEFAULTS, ...getPreferenceValues<Partial<Preferences>>() };
}
