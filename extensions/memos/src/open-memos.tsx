import { getPreferenceValues, open } from "@raycast/api";
import { PreferenceValues } from "./lib/types";

export default async function openMemos() {
  const { memosServerUrl } = getPreferenceValues<PreferenceValues>();
  await open(memosServerUrl);
}
