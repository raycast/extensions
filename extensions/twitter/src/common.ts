import { getPreferenceValues } from "@raycast/api";

export function shouldShowListWithDetails(): boolean {
  const { listwithdetail } = getPreferenceValues<{ listwithdetail?: boolean }>();
  return listwithdetail ?? true;
}
