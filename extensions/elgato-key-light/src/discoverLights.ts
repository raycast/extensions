import { showHUD, Toast, showToast } from "@raycast/api";
import { KeyLight } from "./elgato";

export default async function Command() {
  try {
    await showHUD("Discovering Key Lights...");
    const keyLight = await KeyLight.discover(true);
    if (!keyLight) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Key Lights found",
        message: "Could not discover any Key Lights on your network",
        primaryAction: {
          title: "Dismiss",
          onAction: () => {},
        },
      });
      return;
    }

    const lights = KeyLight.keyLights;
    const lightNames = lights.map((light) => light.service.name).join(", ");
    await showToast({
      style: Toast.Style.Success,
      title: `Found ${lights.length} Key Light${lights.length > 1 ? "s" : ""}`,
      message: lightNames,
      primaryAction: {
        title: "Dismiss",
        onAction: () => {},
      },
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to discover Key Lights",
      message: (error as Error).message,
      primaryAction: {
        title: "Dismiss",
        onAction: () => {},
      },
    });
  }
}
