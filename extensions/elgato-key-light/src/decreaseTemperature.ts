import { KeyLight } from "./elgato";
import { run } from "./utils";

const command = async () => {
  const keyLight = await KeyLight.discover();
  await keyLight.decreaseTemperature();
  return "Decreased color temperature";
};

export default run(command);
