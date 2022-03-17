import { KeyLight } from "./elgato";
import { run } from "./utils";

const command = async () => {
  const keyLight = await KeyLight.discover();
  const brightness = await keyLight.decreaseBrightness();
  const formattedBrightness = brightness.toLocaleString("en", { maximumFractionDigits: 0 });
  return `Decreased brightness to ${formattedBrightness}%`;
};

export default run(command);
