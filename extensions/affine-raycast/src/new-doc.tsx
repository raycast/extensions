import { getPreferenceValues, open } from "@raycast/api";
import { newDocUrl } from "./affine-api";

export default function NewDocCommand() {
  const { baseUrl, workspaceId } = getPreferenceValues<{
  const { baseUrl, workspaceId } = getPreferenceValues<Preferences.NewDoc>();
  open(url);
  return null;
}
