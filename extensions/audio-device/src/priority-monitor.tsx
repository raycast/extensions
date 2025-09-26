import { environment, LaunchType, getPreferenceValues, updateCommandMetadata, showHUD } from "@raycast/api";
import {
  getOutputDevices,
  getInputDevices,
  getDefaultOutputDevice,
  getDefaultInputDevice,
  setDefaultOutputDevice,
  setDefaultInputDevice,
  setDefaultSystemDevice,
} from "./audio-device";
import { getOutputPriorityList, getInputPriorityList } from "./priority-utils";

interface Preferences {
  enableAutoSwitch: boolean;
  systemOutput: boolean;
}

export default async function PriorityMonitor() {
  const preferences = getPreferenceValues<Preferences>();
  const isBackground = environment.launchType === LaunchType.Background;

  try {
    // Get current devices and priority lists with individual error handling
    const results = await Promise.allSettled([
      getOutputDevices().catch((err) => {
        console.log("Failed to get output devices:", err);
        return [];
      }),
      getInputDevices().catch((err) => {
        console.log("Failed to get input devices:", err);
        return [];
      }),
      getDefaultOutputDevice().catch((err) => {
        console.log("Failed to get default output device:", err);
        return null;
      }),
      getDefaultInputDevice().catch((err) => {
        console.log("Failed to get default input device:", err);
        return null;
      }),
      getOutputPriorityList().catch((err) => {
        console.log("Failed to get output priority list:", err);
        return [];
      }),
      getInputPriorityList().catch((err) => {
        console.log("Failed to get input priority list:", err);
        return [];
      }),
    ]);

    const resolvedResults = results.map((result) => (result.status === "fulfilled" ? result.value : null));

    // Type-safe destructuring with explicit casting
    const outputDevices = resolvedResults[0] as any[] | null;
    const inputDevices = resolvedResults[1] as any[] | null;
    const currentOutput = resolvedResults[2] as any | null;
    const currentInput = resolvedResults[3] as any | null;
    const outputPriorityList = resolvedResults[4] as string[] | null;
    const inputPriorityList = resolvedResults[5] as string[] | null;

    // Find highest priority available devices
    const getHighestPriorityDevice = (devices: any[], priorityList: string[]) => {
      let highestPriorityDevice = null;
      let highestPriorityRank = Infinity;

      for (const device of devices) {
        const priorityIndex = priorityList.findIndex((name) => name.toLowerCase() === device.name.toLowerCase());

        if (priorityIndex !== -1) {
          const rank = priorityIndex + 1;
          if (rank < highestPriorityRank) {
            highestPriorityRank = rank;
            highestPriorityDevice = device;
          }
        }
      }

      return highestPriorityDevice;
    };

    // Ensure we have valid data before proceeding
    if (!outputDevices || !inputDevices || !outputPriorityList || !inputPriorityList) {
      console.log("Missing essential data, skipping this cycle");
      await updateCommandMetadata({ subtitle: "Waiting for device data..." });
      return;
    }

    const topOutputDevice = getHighestPriorityDevice(outputDevices, outputPriorityList);
    const topInputDevice = getHighestPriorityDevice(inputDevices, inputPriorityList);

    // Check if we need to switch and auto-switch is enabled
    const switchedDevices: string[] = [];

    if (preferences.enableAutoSwitch && isBackground) {
      // Check output device
      if (topOutputDevice && currentOutput && currentOutput.uid !== topOutputDevice.uid) {
        try {
          await setDefaultOutputDevice(topOutputDevice.id);
          if (preferences.systemOutput) {
            await setDefaultSystemDevice(topOutputDevice.id);
          }
          switchedDevices.push(`Output: ${topOutputDevice.name}`);
        } catch (error) {
          console.log("Failed to switch output device:", error);
        }
      }

      // Check input device
      if (topInputDevice && currentInput && currentInput.uid !== topInputDevice.uid) {
        try {
          await setDefaultInputDevice(topInputDevice.id);
          switchedDevices.push(`Input: ${topInputDevice.name}`);
        } catch (error) {
          console.log("Failed to switch input device:", error);
        }
      }

      // Show notification if we switched devices
      if (switchedDevices.length > 0) {
        showHUD(`Auto-switched to ${switchedDevices.join(", ")}`);
      }
    }

    // Update command metadata with current status
    const outputStatus = topOutputDevice ? `#1: ${topOutputDevice.name}` : "No priority devices";
    const inputStatus = topInputDevice ? `#1: ${topInputDevice.name}` : "No priority devices";

    await updateCommandMetadata({
      subtitle: preferences.enableAutoSwitch
        ? `Auto: ${outputStatus.split(": ")[1] || "None"} | ${inputStatus.split(": ")[1] || "None"}`
        : "Auto-switch disabled",
    });
  } catch (error) {
    console.log("Priority monitor error:", error);
    await updateCommandMetadata({ subtitle: "Error checking priorities" });
  }
}
