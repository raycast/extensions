import { closeMainWindow } from "@raycast/api";
import { KeyLight } from "./elgato";
import { run } from "./utils";

const command = async () => {
  await closeMainWindow({ clearRootSearch: true });
  const keyLight = await KeyLight.discover();
  const brightness = await keyLight.increaseBrightness();

  return brightness
    ? `Increased brightness to ${brightness.toLocaleString("en", { maximumFractionDigits: 0 })}%`
    : "Error increasing brightness";
};

export default run(command);
