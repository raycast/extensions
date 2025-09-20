import { getPreferenceValues } from "@raycast/api";

/**
 * Get the volume of the KEF LSX2, LSX 2LT
 */
export default async function () {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`http://${preferences["ip-address"]}/api/getData?path=player:volume&roles=value`);
  const data = (await response.json()) as { type: "i32_"; i32_: number }[];
  return data[0].i32_ ?? 0;
}
