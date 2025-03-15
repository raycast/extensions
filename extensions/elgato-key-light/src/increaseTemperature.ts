import { KeyLight } from "./elgato";
import { popToRoot, showToast, Toast } from "@raycast/api";

const command = async () => {
  const keyLight = await KeyLight.discover();
  const temperature = await keyLight.increaseTemperature();

  await Promise.all([
    showToast({
      style: Toast.Style.Success,
      title:
        temperature !== undefined
          ? `Temperature increased to ${Math.round(((temperature - 143) / (344 - 143)) * 100)}%`
          : "Temperature increased",
    }),
    popToRoot(),
  ]);
};

export default command;
