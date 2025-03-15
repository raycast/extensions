import { KeyLight } from "./elgato";
import { popToRoot, showToast, Toast } from "@raycast/api";

const command = async () => {
  const keyLight = await KeyLight.discover();
  const brightness = await keyLight.increaseBrightness();

  await Promise.all([
    showToast({
      style: Toast.Style.Success,
      title:
        brightness !== undefined
          ? `Brightness: ${brightness.toLocaleString("en", { maximumFractionDigits: 0 })}%`
          : "Brightness increased",
    }),
    popToRoot(),
  ]);
};

export default command;
