import {
  environment,
  LaunchType,
  getPreferenceValues,
  updateCommandMetadata,
  showHUD,
  LocalStorage,
} from "@raycast/api";
import {
  getOutputDevices,
  getInputDevices,
  getDefaultOutputDevice,
  getDefaultInputDevice,
  setDefaultOutputDevice,
  setDefaultInputDevice,
  setDefaultSystemDevice,
} from "./audio-device";
import {
  getOutputPriorityList,
  getInputPriorityList,
  isPriorityListDirty,
  clearPriorityListDirty,
} from "./priority-utils";

interface Preferences {
  enableAutoSwitch: boolean;
  systemOutput: boolean;
}

interface CachedState {
  outputUID?: string;
  inputUID?: string;
  outputPriorityList?: string[];
  inputPriorityList?: string[];
  lastUpdate?: number;
}

const CACHE_KEY = "priority-monitor-state";
// Cache persists until actual changes detected - no time-based expiration

export default async function PriorityMonitor() {
  const startTime = Date.now();
  const preferences = getPreferenceValues<Preferences>();
  const isBackground = environment.launchType === LaunchType.Background;

  console.log(`[PriorityMonitor] ===== EXECUTION START =====`);
  console.log(`[PriorityMonitor] Launch type: ${isBackground ? "BACKGROUND" : "USER_INITIATED"}`);
  console.log(`[PriorityMonitor] Timestamp: ${new Date().toISOString()}`);
  console.log(`[PriorityMonitor] Auto-switch enabled: ${preferences.enableAutoSwitch}`);

  try {
    // Early exit if auto-switch is disabled
    if (!preferences.enableAutoSwitch) {
      console.log(`[PriorityMonitor] STEP 0: Early exit - auto-switch disabled`);
      await updateCommandMetadata({ subtitle: "Auto-switch disabled" });
      const duration = Date.now() - startTime;
      console.log(`[PriorityMonitor] ===== EXECUTION END (${duration}ms) =====\n`);
      return;
    }

    // Load cached state
    console.log(`[PriorityMonitor] Loading cached state...`);
    const cacheLoadStart = Date.now();
    const cachedStateStr = await LocalStorage.getItem<string>(CACHE_KEY);
    const cachedState: CachedState = cachedStateStr ? JSON.parse(cachedStateStr) : {};
    const cacheLoadDuration = Date.now() - cacheLoadStart;
    console.log(`[PriorityMonitor] Cache loaded in ${cacheLoadDuration}ms, has data: ${!!cachedStateStr}`);
    if (cachedState.lastUpdate) {
      console.log(`[PriorityMonitor] Cache last updated: ${new Date(cachedState.lastUpdate).toISOString()}`);
    }

    // STEP 1: Check dirty flags (minimal memory read)
    console.log(`[PriorityMonitor] STEP 1: Checking dirty flags...`);
    const dirtyCheckStart = Date.now();
    const [outputDirty, inputDirty] = await Promise.all([isPriorityListDirty(true), isPriorityListDirty(false)]);
    const dirtyCheckDuration = Date.now() - dirtyCheckStart;
    console.log(`[PriorityMonitor] STEP 1: Dirty flags checked in ${dirtyCheckDuration}ms`);
    console.log(`[PriorityMonitor] STEP 1: Output dirty: ${outputDirty}, Input dirty: ${inputDirty}`);

    const priorityListChanged = outputDirty || inputDirty;
    // No time-based cache expiration - only invalidate on actual changes
    console.log(`[PriorityMonitor] STEP 1: Priority list changed: ${priorityListChanged}`);

    // STEP 2: Always check current device UIDs (lightweight but responsive)
    console.log(`[PriorityMonitor] STEP 2: Getting current device UIDs for change detection...`);
    const deviceCheckStart = Date.now();
    const [currentOutput, currentInput] = await Promise.all([
      getDefaultOutputDevice().catch(() => null),
      getDefaultInputDevice().catch(() => null),
    ]);
    const deviceCheckDuration = Date.now() - deviceCheckStart;
    console.log(`[PriorityMonitor] STEP 2: Current device UIDs retrieved in ${deviceCheckDuration}ms`);
    console.log(
      `[PriorityMonitor] STEP 2: Output: ${currentOutput?.name || "null"}, Input: ${currentInput?.name || "null"}`,
    );

    if (!currentOutput || !currentInput) {
      console.log(`[PriorityMonitor] STEP 2: Missing devices - output: ${!!currentOutput}, input: ${!!currentInput}`);
      await updateCommandMetadata({ subtitle: "No audio devices found" });
      const duration = Date.now() - startTime;
      console.log(`[PriorityMonitor] ===== EXECUTION END (${duration}ms) =====\n`);
      return;
    }

    // STEP 3: Smart change detection - check if current devices match cache
    const deviceChanged = currentOutput.uid !== cachedState.outputUID || currentInput.uid !== cachedState.inputUID;

    // STEP 3.1: Get available devices for proper priority validation
    console.log(`[PriorityMonitor] STEP 3.1: Getting available devices for priority validation...`);
    const validationStart = Date.now();

    const [availableOutputDevices, availableInputDevices] = await Promise.all([
      getOutputDevices().catch(() => []),
      getInputDevices().catch(() => []),
    ]);

    const availableDeviceLoadDuration = Date.now() - validationStart;
    console.log(`[PriorityMonitor] STEP 3.1: Available devices loaded in ${availableDeviceLoadDuration}ms`);
    console.log(
      `[PriorityMonitor] STEP 3.1: Found ${availableOutputDevices.length} available output devices, ${availableInputDevices.length} available input devices`,
    );

    // Extract available device names for filtering
    const availableOutputNames = availableOutputDevices.map((device) => device.name.toLowerCase());
    const availableInputNames = availableInputDevices.map((device) => device.name.toLowerCase());

    console.log(
      `[PriorityMonitor] STEP 3.1: Available outputs: [${availableOutputNames.slice(0, 3).join(", ")}${availableOutputNames.length > 3 ? "..." : ""}]`,
    );
    console.log(
      `[PriorityMonitor] STEP 3.1: Available inputs: [${availableInputNames.slice(0, 3).join(", ")}${availableInputNames.length > 3 ? "..." : ""}]`,
    );

    // Filter cached priority lists to only include available devices
    const cachedOutputPriorityList = cachedState.outputPriorityList || [];
    const cachedInputPriorityList = cachedState.inputPriorityList || [];

    const availableOutputPriorities = cachedOutputPriorityList.filter((deviceName) =>
      availableOutputNames.includes(deviceName.toLowerCase()),
    );
    const availableInputPriorities = cachedInputPriorityList.filter((deviceName) =>
      availableInputNames.includes(deviceName.toLowerCase()),
    );

    console.log(
      `[PriorityMonitor] STEP 3.1: Filtered to available priorities - output: ${availableOutputPriorities.length} devices, input: ${availableInputPriorities.length} devices`,
    );
    if (availableOutputPriorities.length > 0) {
      console.log(
        `[PriorityMonitor] STEP 3.1: Available output priorities: [${availableOutputPriorities.slice(0, 3).join(", ")}${availableOutputPriorities.length > 3 ? "..." : ""}]`,
      );
    }
    if (availableInputPriorities.length > 0) {
      console.log(
        `[PriorityMonitor] STEP 3.1: Available input priorities: [${availableInputPriorities.slice(0, 3).join(", ")}${availableInputPriorities.length > 3 ? "..." : ""}]`,
      );
    }

    // Check if current devices match the top available priority devices
    const isOutputOptimal =
      availableOutputPriorities.length === 0 ||
      availableOutputPriorities[0]?.toLowerCase() === currentOutput.name.toLowerCase();
    const isInputOptimal =
      availableInputPriorities.length === 0 ||
      availableInputPriorities[0]?.toLowerCase() === currentInput.name.toLowerCase();

    const validationDuration = Date.now() - validationStart;
    console.log(`[PriorityMonitor] STEP 3.1: Priority validation completed in ${validationDuration}ms`);
    console.log(
      `[PriorityMonitor] STEP 3.1: Current output '${currentOutput.name}' is optimal among available: ${isOutputOptimal}`,
    );
    console.log(
      `[PriorityMonitor] STEP 3.1: Current input '${currentInput.name}' is optimal among available: ${isInputOptimal}`,
    );

    if (!isOutputOptimal && availableOutputPriorities.length > 0) {
      console.log(
        `[PriorityMonitor] STEP 3.1: ⚠️  Better output device available - expected: '${availableOutputPriorities[0]}', actual: '${currentOutput.name}'`,
      );
    }
    if (!isInputOptimal && availableInputPriorities.length > 0) {
      console.log(
        `[PriorityMonitor] STEP 3.1: ⚠️  Better input device available - expected: '${availableInputPriorities[0]}', actual: '${currentInput.name}'`,
      );
    }

    const priorityMismatch = !isOutputOptimal || !isInputOptimal;
    const needsFullCheck = priorityListChanged || deviceChanged || priorityMismatch;

    console.log(`[PriorityMonitor] STEP 3: Final change detection analysis:`);
    console.log(`[PriorityMonitor] STEP 3: - Priority lists changed: ${priorityListChanged}`);
    console.log(`[PriorityMonitor] STEP 3: - Device UIDs changed: ${deviceChanged}`);
    console.log(`[PriorityMonitor] STEP 3: - Priority mismatch detected: ${priorityMismatch}`);
    console.log(`[PriorityMonitor] STEP 3: Current UIDs - output: ${currentOutput.uid}, input: ${currentInput.uid}`);
    console.log(
      `[PriorityMonitor] STEP 3: Cached UIDs - output: ${cachedState.outputUID || "none"}, input: ${cachedState.inputUID || "none"}`,
    );
    console.log(`[PriorityMonitor] STEP 3: Needs full check: ${needsFullCheck}`);

    if (priorityMismatch) {
      console.log(
        `[PriorityMonitor] STEP 3: 🔄 Priority mismatch triggers full device enumeration to find higher priority devices`,
      );
    }

    // STEP 3.1: Fast path - no changes detected, cache is reliable
    if (!needsFullCheck) {
      console.log(`[PriorityMonitor] STEP 3.1: Fast path - no changes detected`);
      await updateCommandMetadata({
        subtitle: `Active: ${currentOutput.name} | ${currentInput.name}`,
      });
      const duration = Date.now() - startTime;
      console.log(`[PriorityMonitor] STEP 3.1: Fast path completed (${duration}ms)`);
      console.log(`[PriorityMonitor] ===== EXECUTION END (${duration}ms) =====\n`);
      return;
    }

    // Continue to full processing when changes detected
    console.log(`[PriorityMonitor] STEP 3.2: Changes detected - proceeding with full device analysis`);

    // STEP 4: Something changed or cache expired - do the expensive work
    console.log(`[PriorityMonitor] STEP 4: Loading full device data...`);
    const fullLoadStart = Date.now();
    const [outputDevices, inputDevices, outputPriorityList, inputPriorityList] = await Promise.all([
      getOutputDevices().catch(() => []),
      getInputDevices().catch(() => []),
      getOutputPriorityList().catch(() => []),
      getInputPriorityList().catch(() => []),
    ]);
    const fullLoadDuration = Date.now() - fullLoadStart;
    console.log(`[PriorityMonitor] STEP 4: Full device data loaded in ${fullLoadDuration}ms`);
    console.log(
      `[PriorityMonitor] STEP 4: Found ${outputDevices.length} output devices, ${inputDevices.length} input devices`,
    );
    console.log(
      `[PriorityMonitor] STEP 4: Priority lists - output: ${outputPriorityList.length} items, input: ${inputPriorityList.length} items`,
    );

    if (outputDevices.length === 0 || inputDevices.length === 0) {
      console.log(
        `[PriorityMonitor] STEP 4: No devices available - output: ${outputDevices.length}, input: ${inputDevices.length}`,
      );
      await updateCommandMetadata({ subtitle: "No devices available" });
      const duration = Date.now() - startTime;
      console.log(`[PriorityMonitor] ===== EXECUTION END (${duration}ms) =====\n`);
      return;
    }

    // STEP 5: Find highest priority devices
    console.log(`[PriorityMonitor] STEP 5: Calculating priority rankings...`);
    const priorityCalcStart = Date.now();

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
    const priorityCalcDuration = Date.now() - priorityCalcStart;

    console.log(`[PriorityMonitor] STEP 5: Priority calculation completed in ${priorityCalcDuration}ms`);
    console.log(`[PriorityMonitor] STEP 5: Top output device: ${topOutputDevice?.name || "none"}`);
    console.log(`[PriorityMonitor] STEP 5: Top input device: ${topInputDevice?.name || "none"}`);

    // STEP 6: Perform switching if needed and we're in background
    console.log(`[PriorityMonitor] STEP 6: Checking if switching is needed...`);
    const switchedDevices: string[] = [];

    const shouldSwitchOutput = topOutputDevice && currentOutput.uid !== topOutputDevice.uid;
    const shouldSwitchInput = topInputDevice && currentInput.uid !== topInputDevice.uid;

    console.log(`[PriorityMonitor] STEP 6: Should switch - output: ${shouldSwitchOutput}, input: ${shouldSwitchInput}`);
    console.log(
      `[PriorityMonitor] STEP 6: Is background: ${isBackground}, auto-switch enabled: ${preferences.enableAutoSwitch}`,
    );

    if (isBackground && preferences.enableAutoSwitch) {
      // Check output device
      if (topOutputDevice && currentOutput.uid !== topOutputDevice.uid) {
        console.log(
          `[PriorityMonitor] STEP 6: Switching output device from '${currentOutput.name}' to '${topOutputDevice.name}'`,
        );
        const outputSwitchStart = Date.now();
        try {
          await setDefaultOutputDevice(topOutputDevice.id);
          const outputSwitchDuration = Date.now() - outputSwitchStart;
          console.log(`[PriorityMonitor] STEP 6: Output device switched in ${outputSwitchDuration}ms`);

          if (preferences.systemOutput) {
            console.log(`[PriorityMonitor] STEP 6: Also setting system output...`);
            const systemSwitchStart = Date.now();
            await setDefaultSystemDevice(topOutputDevice.id);
            const systemSwitchDuration = Date.now() - systemSwitchStart;
            console.log(`[PriorityMonitor] STEP 6: System output set in ${systemSwitchDuration}ms`);
          }
          switchedDevices.push(`Output: ${topOutputDevice.name}`);
        } catch (error) {
          console.log(`[PriorityMonitor] STEP 6: Failed to switch output device:`, error);
        }
      }

      // Check input device
      if (topInputDevice && currentInput.uid !== topInputDevice.uid) {
        console.log(
          `[PriorityMonitor] STEP 6: Switching input device from '${currentInput.name}' to '${topInputDevice.name}'`,
        );
        const inputSwitchStart = Date.now();
        try {
          await setDefaultInputDevice(topInputDevice.id);
          const inputSwitchDuration = Date.now() - inputSwitchStart;
          console.log(`[PriorityMonitor] STEP 6: Input device switched in ${inputSwitchDuration}ms`);
          switchedDevices.push(`Input: ${topInputDevice.name}`);
        } catch (error) {
          console.log(`[PriorityMonitor] STEP 6: Failed to switch input device:`, error);
        }
      }

      // Show notification if we switched devices
      if (switchedDevices.length > 0) {
        console.log(`[PriorityMonitor] STEP 6: Showing HUD notification for switched devices`);
        showHUD(`Auto-switched to ${switchedDevices.join(", ")}`);
      } else {
        console.log(`[PriorityMonitor] STEP 6: No devices switched`);
      }
    } else {
      console.log(`[PriorityMonitor] STEP 6: Skipping device switching - not in background or auto-switch disabled`);
    }

    // STEP 7: Update cache with new state and clear dirty flags
    console.log(`[PriorityMonitor] STEP 7: Updating cache and clearing dirty flags...`);
    const cacheUpdateStart = Date.now();

    const newState: CachedState = {
      outputUID: topOutputDevice?.uid || currentOutput.uid,
      inputUID: topInputDevice?.uid || currentInput.uid,
      outputPriorityList,
      inputPriorityList,
      lastUpdate: Date.now(),
    };

    console.log(`[PriorityMonitor] STEP 7: Caching UIDs - output: ${newState.outputUID}, input: ${newState.inputUID}`);

    await Promise.all([
      LocalStorage.setItem(CACHE_KEY, JSON.stringify(newState)),
      outputDirty ? clearPriorityListDirty(true) : Promise.resolve(),
      inputDirty ? clearPriorityListDirty(false) : Promise.resolve(),
    ]);

    const cacheUpdateDuration = Date.now() - cacheUpdateStart;
    console.log(`[PriorityMonitor] STEP 7: Cache updated in ${cacheUpdateDuration}ms`);
    console.log(`[PriorityMonitor] STEP 7: Dirty flags cleared - output: ${outputDirty}, input: ${inputDirty}`);

    // STEP 8: Update command metadata
    console.log(`[PriorityMonitor] STEP 8: Updating command metadata...`);
    const metadataUpdateStart = Date.now();

    const outputStatus = topOutputDevice ? topOutputDevice.name : currentOutput.name;
    const inputStatus = topInputDevice ? topInputDevice.name : currentInput.name;

    await updateCommandMetadata({
      subtitle: preferences.enableAutoSwitch ? `Priority: ${outputStatus} | ${inputStatus}` : "Auto-switch disabled",
    });

    const metadataUpdateDuration = Date.now() - metadataUpdateStart;
    console.log(`[PriorityMonitor] STEP 8: Metadata updated in ${metadataUpdateDuration}ms`);
    console.log(`[PriorityMonitor] STEP 8: Final status - output: ${outputStatus}, input: ${inputStatus}`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`[PriorityMonitor] ERROR: Priority monitor error after ${duration}ms:`, error);
    await updateCommandMetadata({ subtitle: "Error checking priorities" });
  }

  const totalDuration = Date.now() - startTime;
  console.log(`[PriorityMonitor] ===== EXECUTION END (${totalDuration}ms) =====\n`);
}
