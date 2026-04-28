import { getPreferenceValues, open } from "@raycast/api";
import { newDocUrl } from "./affine-api";

export default async function NewDocCommand() {
  const { baseUrl, workspaceId } = getPreferenceValues<Preferences.NewDoc>();
  const url = newDocUrl(baseUrl, workspaceId?.trim() || undefined);
  await open(url);
}
