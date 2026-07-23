import { KeyLight } from "../elgato";
import { getTargetLightNames } from "../utils";

export default async function tool() {
  const keyLight = await KeyLight.discover();
  return await keyLight.getSettings(await getTargetLightNames());
}
