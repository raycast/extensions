import { getPreferenceValues, open } from "@raycast/api";
import { newDocUrl } from "./affine-api";

export default function NewDocCommand() {
  const { baseUrl, workspaceId } = getPreferenceValues<Preferences.NewDoc>();
  const url = newDocUrl(baseUrl, workspaceId);
  open(url);
  return null;
}
