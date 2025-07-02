import { getPreferenceValues } from "@raycast/api";
import CoolifyApp from "../types/coolifyApp";

export default async function getAllCoolifyApps(): Promise<CoolifyApp[]> {
  const { coolifyToken, coolifyUrl } = getPreferenceValues<Preferences>();

  if (!coolifyUrl) {
    return [];
  }

  const response = await fetch(`${coolifyUrl}/api/v1/applications`, {
    headers: {
      Authorization: `Bearer ${coolifyToken}`,
    },
  });
  const coolifyApps = await response.json();
  return coolifyApps;
}
