import { showToast, Toast } from "@raycast/api";
import { KeyLight } from "./elgato";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    const keyLight = await KeyLight.discover(true);
    if (!keyLight) {
      showFailureToast(new Error("Could not discover any Key Lights on your network"), {
        title: "No Key Lights found",
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
    showFailureToast(error, { title: "Failed to discover Key Lights" });
  }
}
