import { getPreferenceValues, open, PreferenceValues, showToast, Toast } from "@raycast/api";

export default function OpenMiniflux() {
  const { baseUrl }: PreferenceValues = getPreferenceValues();

  if (baseUrl) {
    open(baseUrl);
  } else {
    showToast(Toast.Style.Failure, "No base URL set, unable to open Miniflux");
  }
}
