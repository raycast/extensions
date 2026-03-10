import { getPreferenceValues, open } from "@raycast/api";
import { newDocUrl } from "./affine-api";

export default function NewDocCommand() {
  const { baseUrl, workspaceId } = getPreferenceValues<{
    baseUrl: string;
    workspaceId?: string;
  }>();
  const url = newDocUrl(baseUrl, workspaceId?.trim() || undefined);
  open(url);
  return null;
}
