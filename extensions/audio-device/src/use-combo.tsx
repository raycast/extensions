import { closeMainWindow, getPreferenceValues, popToRoot, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
      showFailureToast(new Error(`Input device "${inputName}" not found`));
      return;
    }

    if (!outputDevice) {
      showFailureToast(new Error(`Output device "${outputName}" not found`));
      return;
    }

    await setDefaultInputDevice(inputDevice.id);
    await setDefaultOutputDevice(outputDevice.id);
    if (preferences.systemOutput) {
      await setDefaultSystemDevice(outputDevice.id);
    }

    closeMainWindow({ clearRootSearch: true });
    popToRoot({ clearSearchBar: true });
    showHUD(`${comboName} in use`);
  } catch (error) {
    console.error(error);
    showFailureToast(error, { title: "Failed to switch devices" });
  }
}
