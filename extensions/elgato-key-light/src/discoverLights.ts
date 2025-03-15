import { showToast, Toast } from "@raycast/api";
import { KeyLight } from "./elgato";

export default async function Command() {
  try {
    const keyLight = await KeyLight.discover(true);
    if (!keyLight) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Key Lights found",
        message: "Could not discover any Key Lights on your network",
      });
      return;
    }

    const lights = KeyLight.keyLights;
    const lightNames = lights.map((light) => light.service.name).join(", ");
    await showToast({
      style: Toast.Style.Success,
      title: `Found ${lights.length} Key Light${lights.length > 1 ? "s" : ""}`,
      message: lightNames,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to discover Key Lights",
      message: (error as Error).message,
    });
  }
}
