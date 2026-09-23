import { getPreferenceValues } from "@raycast/api";

export function shouldShowListWithDetails(): boolean {
  const { listwithdetail } = getPreferenceValues<Preferences>();
  return listwithdetail ?? true;
}
