import { closeMainWindow } from "@raycast/api";
import { KeyLight } from "./elgato";
import { run } from "./utils";

const command = async () => {
  await closeMainWindow({ clearRootSearch: true });
  const keyLight = await KeyLight.discover();
  const brightness = await keyLight.increaseBrightness();
  const formattedBrightness = brightness.toLocaleString("en", { maximumFractionDigits: 0 });
  return `Increased brightness to ${formattedBrightness}%`;
};

export default run(command);
