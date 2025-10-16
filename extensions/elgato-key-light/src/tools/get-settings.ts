import { KeyLight } from "../elgato";

export default async function tool() {
  const keyLight = await KeyLight.discover();
  return await keyLight.getSettings();
}
