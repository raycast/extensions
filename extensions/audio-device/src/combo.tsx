import { closeMainWindow, getPreferenceValues, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import {
  getInputDevices,
  getOutputDevices,
  setDefaultInputDevice,
  setDefaultOutputDevice,
  setDefaultSystemDevice,
} from "./audio-device";

interface ComboPreferences {
  input: string;
  output: string;
  systemOutput: boolean;
  comboName: string;
}

export default async function Combo() {
  const preferences = getPreferenceValues<ComboPreferences>();
  const inputName = preferences.input;
  const outputName = preferences.output;
  const comboName = preferences.comboName;

  try {
    const inputDevices = await getInputDevices();
    const outputDevices = await getOutputDevices();

    const inputDevice = inputDevices.find((d) => d.name === inputName);
    const outputDevice = outputDevices.find((d) => d.name === outputName);

    if (!inputDevice) {
      showToast(Toast.Style.Failure, "Error", `Input device "${inputName}" not found`);
      return;
    }

    if (!outputDevice) {
      showToast(Toast.Style.Failure, "Error", `Output device "${outputName}" not found`);
      return;
    }

    await setDefaultInputDevice(inputDevice.id);
    await setDefaultOutputDevice(outputDevice.id);
    if (preferences.systemOutput) {
      await setDefaultSystemDevice(outputDevice.id);
    }

    closeMainWindow({ clearRootSearch: true });
    popToRoot({ clearSearchBar: true });
    showHUD(`${comboName} audio combo enabled`);
  } catch (error) {
    console.error(error);
    showToast(Toast.Style.Failure, "Error", "Failed to switch devices");
  }
}
