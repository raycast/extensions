import { KeyLight } from "./elgato";
import { popToRoot, showToast, Toast } from "@raycast/api";

const command = async () => {
  const keyLight = await KeyLight.discover();
  const temperature = await keyLight.decreaseTemperature();

  await Promise.all([
    showToast({
      style: Toast.Style.Success,
      title:
        temperature !== undefined
          ? `Temperature decreased to ${Math.round(((temperature - 143) / (344 - 143)) * 100)}%`
          : "Temperature decreased",
    }),
    popToRoot(),
  ]);
};

export default command;
