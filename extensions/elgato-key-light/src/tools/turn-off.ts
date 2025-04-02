import { KeyLight } from "../elgato";

export default async function tool() {
  const keyLight = await KeyLight.discover();
  await keyLight.turnOff();
}
