import { getPreferenceValues } from "@raycast/api";

/**
 * Set the volume of the KEF LSX2, LSX 2LT
 */
export default async function setVolume(volume: number) {
  const preferences = getPreferenceValues<Preferences>();
  await fetch(
    `http://${preferences["ip-address"]}/api/setData?path=player:volume&roles=value&value={"type":"i32_","i32_":${volume}}`,
  );
}
