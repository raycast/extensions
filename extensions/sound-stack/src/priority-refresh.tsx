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

export default async function PriorityRefresh() {
  const startTime = Date.now();
  const preferences = getPreferenceValues<Preferences>();
  const isBackground = environment.launchType === LaunchType.Background;

  console.log(`[PriorityRefresh] ===== MANUAL REFRESH START =====`);
  console.log(`[PriorityRefresh] Launch type: ${isBackground ? "BACKGROUND" : "USER_INITIATED"}`);
  console.log(`[PriorityRefresh] Timestamp: ${new Date().toISOString()}`);

  try {
    // Always show what we're doing for manual refresh
    await updateCommandMetadata({ subtitle: "Checking audio devices..." });

    // Get current devices
    console.log(`[PriorityRefresh] Getting current devices...`);
    const deviceCheckStart = Date.now();
    const [currentOutput, currentInput] = await Promise.all([
      getDefaultOutputDevice().catch(() => null),
      getDefaultInputDevice().catch(() => null),
    ]);
    const deviceCheckDuration = Date.now() - deviceCheckStart;
    console.log(`[PriorityRefresh] Current devices retrieved in ${deviceCheckDuration}ms`);
    console.log(`[PriorityRefresh] Output: ${currentOutput?.name || "null"}, Input: ${currentInput?.name || "null"}`);

    if (!currentOutput || !currentInput) {
      console.log(`[PriorityRefresh] Missing devices - output: ${!!currentOutput}, input: ${!!currentInput}`);
      await updateCommandMetadata({ subtitle: "No audio devices found" });
      await showHUD("❌ No audio devices found");
      return;
    }

    // Get full device data and priority lists
    console.log(`[PriorityRefresh] Loading full device data...`);
    const fullLoadStart = Date.now();
    const [outputDevices, inputDevices, outputPriorityList, inputPriorityList] = await Promise.all([
      getOutputDevices().catch(() => []),
      getInputDevices().catch(() => []),
      getOutputPriorityList().catch(() => []),
      getInputPriorityList().catch(() => []),
    ]);
    const fullLoadDuration = Date.now() - fullLoadStart;
    console.log(`[PriorityRefresh] Full device data loaded in ${fullLoadDuration}ms`);
    console.log(`[PriorityRefresh] Found ${outputDevices.length} output devices, ${inputDevices.length} input devices`);

    if (outputDevices.length === 0 || inputDevices.length === 0) {
      console.log(
        `[PriorityRefresh] No devices available - output: ${outputDevices.length}, input: ${inputDevices.length}`,
      );
      await updateCommandMetadata({ subtitle: "No devices available" });
      await showHUD("❌ No audio devices available");
      return;
    }

    // Find highest priority devices
    console.log(`[PriorityRefresh] Calculating priority rankings...`);
    const getHighestPriorityDevice = (devices: AudioDevice[], priorityList: string[]) => {
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

    const topOutputDevice = getHighestPriorityDevice(outputDevices, outputPriorityList);
    const topInputDevice = getHighestPriorityDevice(inputDevices, inputPriorityList);

    console.log(
      `[PriorityRefresh] Top priority devices - output: ${topOutputDevice?.name || "none"}, input: ${topInputDevice?.name || "none"}`,
    );

    // Check if switching is needed
    const shouldSwitchOutput = topOutputDevice && currentOutput.uid !== topOutputDevice.uid;
    const shouldSwitchInput = topInputDevice && currentInput.uid !== topInputDevice.uid;

    console.log(`[PriorityRefresh] Should switch - output: ${shouldSwitchOutput}, input: ${shouldSwitchInput}`);

    // Perform switching (manual refresh always switches regardless of enableAutoSwitch)
    const switchedDevices: string[] = [];

    if (shouldSwitchOutput && topOutputDevice) {
      console.log(
        `[PriorityRefresh] Switching output device from '${currentOutput.name}' to '${topOutputDevice.name}'`,
      );
      try {
        await setDefaultOutputDevice(topOutputDevice.id);
        if (preferences.systemOutput) {
          await setDefaultSystemDevice(topOutputDevice.id);
        }
        switchedDevices.push(`Output: ${topOutputDevice.name}`);
      } catch (error) {
        console.log(`[PriorityRefresh] Failed to switch output device:`, error);
      }
    }

    if (shouldSwitchInput && topInputDevice) {
      console.log(`[PriorityRefresh] Switching input device from '${currentInput.name}' to '${topInputDevice.name}'`);
      try {
        await setDefaultInputDevice(topInputDevice.id);
        switchedDevices.push(`Input: ${topInputDevice.name}`);
      } catch (error) {
        console.log(`[PriorityRefresh] Failed to switch input device:`, error);
      }
    }

    // Show results
    if (switchedDevices.length > 0) {
      const message = `✅ Switched to ${switchedDevices.join(", ")}`;
      console.log(`[PriorityRefresh] ${message}`);
      await showHUD(message);
    } else {
      const message = "✅ Already using highest priority devices";
      console.log(`[PriorityRefresh] ${message}`);
      await showHUD(message);
    }

    // Update metadata
    const outputStatus = topOutputDevice ? topOutputDevice.name : currentOutput.name;
    const inputStatus = topInputDevice ? topInputDevice.name : currentInput.name;
    await updateCommandMetadata({
      subtitle: `Active: ${outputStatus} | ${inputStatus}`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`[PriorityRefresh] ERROR: Manual refresh error after ${duration}ms:`, error);
    await updateCommandMetadata({ subtitle: "Error during refresh" });
    await showHUD("❌ Error during device refresh");
  }

  const totalDuration = Date.now() - startTime;
  console.log(`[PriorityRefresh] ===== MANUAL REFRESH END (${totalDuration}ms) =====\n`);
}
