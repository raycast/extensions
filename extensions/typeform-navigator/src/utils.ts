import { getPreferenceValues } from "@raycast/api";

export function adminUrl(url: string): string {
  const { dataCenter } = getPreferenceValues<Preferences>();
  if (dataCenter === "default") return url.replace("api.typeform", "admin.typeform");
  return url.replace("api.eu.typeform", "admin.typeform");
}
