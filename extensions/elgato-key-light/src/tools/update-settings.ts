import { KeyLight, KeyLightSettings } from "../elgato";

export default async function tool(settings: KeyLightSettings) {
  const keyLight = await KeyLight.discover();
  await keyLight.update(settings);
}
