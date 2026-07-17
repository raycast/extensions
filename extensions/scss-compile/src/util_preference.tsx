import { getPreferenceValues } from "@raycast/api";

export function getPref_sassCompilerPath(): string {
  const prefernce = getPreferenceValues<Preferences>();
  return prefernce.pref_compilerPath;
}
export function getPref_deleteCSS(): boolean {
  const prefernce = getPreferenceValues<Preferences>();
  if (prefernce.pref_delBefCompile == "delete-css" || prefernce.pref_delBefCompile == "delete-css-sourcemap") {
    return true;
  } else {
    return false;
  }
}
export function getPref_deleteSourceMap(): boolean {
  const prefernce = getPreferenceValues<Preferences>();
  if (prefernce.pref_delBefCompile == "delete-css-sourcemap") {
    return true;
  } else {
    return false;
  }
}
