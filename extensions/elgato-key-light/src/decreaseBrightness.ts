import { KeyLight } from "./elgato";
import { run } from "./utils";

const command = async () => {
  const keyLight = await KeyLight.discover();
  const brightness = await keyLight.decreaseBrightness();

  return brightness
    ? `Decreased brightness to ${brightness.toLocaleString("en", { maximumFractionDigits: 0 })}%`
    : "Error decreasing brightness";
};

export default run(command);
