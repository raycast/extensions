import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import {
  getInputDevices,
  getOutputDevices,
  getDefaultInputDevice,
  getDefaultOutputDevice,
  TransportType,
  setDefaultOutputDevice,
  setDefaultInputDevice,
  setDefaultSystemDevice,
  AudioDevice,
} from "./audio-device";
import {
  getOutputPriorityList,
  getInputPriorityList,
  setOutputPriorityList,
  setInputPriorityList,
  getDeviceInfo,
  saveDeviceInfo,
} from "./priority-utils";

type Device = {
  id: string;
  uid: string;
  name: string;
  transportType: string;
  isInput: boolean;
  isOutput: boolean;
  priorityRank: number;
  isAvailable: boolean;
  isCurrent: boolean;
};

interface Preferences {
  enableAutoSwitch: boolean;
  systemOutput: boolean;
}

export default function ListDevices() {
  const preferences = getPreferenceValues<Preferences>();

  // Local state for priority lists to enable immediate updates
  const [localOutputPriorityList, setLocalOutputPriorityList] = useState<string[]>([]);
  const [localInputPriorityList, setLocalInputPriorityList] = useState<string[]>([]);

  const { data: deviceData, isLoading } = usePromise(async () => {
    const [outputDevices, inputDevices, currentOutputDevice, currentInputDevice] = await Promise.all([
      getOutputDevices(),
      getInputDevices(),
      getDefaultOutputDevice(),
      getDefaultInputDevice(),
    ]);

    // Get existing priority lists (don't auto-add missing devices here)
    let [outputPriorityList, inputPriorityList] = await Promise.all([getOutputPriorityList(), getInputPriorityList()]);

    // Get stored device info for transport types of disconnected devices
    const [outputDeviceInfo, inputDeviceInfo] = await Promise.all([getDeviceInfo(true), getDeviceInfo(false)]);

    // Save device info for currently available devices, merging with existing stored info
    // This ensures we keep info for disconnected devices while updating info for connected ones
    const updatedOutputDeviceInfo = [...outputDeviceInfo];
    const updatedInputDeviceInfo = [...inputDeviceInfo];

    // Update or add info for currently available devices
    outputDevices.forEach((device) => {
      const existingIndex = updatedOutputDeviceInfo.findIndex((info) => info.name === device.name);
      const deviceInfo = { name: device.name, transportType: device.transportType };
      if (existingIndex >= 0) {
        updatedOutputDeviceInfo[existingIndex] = deviceInfo;
      } else {
        updatedOutputDeviceInfo.push(deviceInfo);
      }
    });

    inputDevices.forEach((device) => {
      const existingIndex = updatedInputDeviceInfo.findIndex((info) => info.name === device.name);
      const deviceInfo = { name: device.name, transportType: device.transportType };
      if (existingIndex >= 0) {
        updatedInputDeviceInfo[existingIndex] = deviceInfo;
      } else {
        updatedInputDeviceInfo.push(deviceInfo);
      }
    });

    // Save the merged device info
    await Promise.all([
      saveDeviceInfo(
        updatedOutputDeviceInfo.map((info) => ({
          name: info.name,
          transportType: info.transportType as TransportType,
          id: "",
          uid: "",
          isInput: false,
          isOutput: true,
        })),
        true,
      ),
      saveDeviceInfo(
        updatedInputDeviceInfo.map((info) => ({
          name: info.name,
          transportType: info.transportType as TransportType,
          id: "",
          uid: "",
          isInput: true,
          isOutput: false,
        })),
        false,
      ),
    ]);

    // Auto-initialize priority lists if empty - rank all available devices with current active device as #1
    if (outputPriorityList.length === 0 && outputDevices.length > 0) {
      // Start with current active device, then add others
      const prioritizedDevices: string[] = [];
      if (currentOutputDevice) {
        prioritizedDevices.push(currentOutputDevice.name);
      }
      // Add remaining devices that aren't the current one
      outputDevices.forEach((device) => {
        if (!prioritizedDevices.includes(device.name)) {
          prioritizedDevices.push(device.name);
        }
      });
      outputPriorityList = prioritizedDevices;
      await setOutputPriorityList(outputPriorityList);
    }

    if (inputPriorityList.length === 0 && inputDevices.length > 0) {
      // Start with current active device, then add others
      const prioritizedDevices: string[] = [];
      if (currentInputDevice) {
        prioritizedDevices.push(currentInputDevice.name);
      }
      // Add remaining devices that aren't the current one
      inputDevices.forEach((device) => {
        if (!prioritizedDevices.includes(device.name)) {
          prioritizedDevices.push(device.name);
        }
      });
      inputPriorityList = prioritizedDevices;
      await setInputPriorityList(inputPriorityList);
    }

    // Create full device lists including unavailable devices from priority lists
    const createFullDeviceList = (
      availableDevices: AudioDevice[],
      priorityList: string[],
      isOutput: boolean,
      currentDevice: AudioDevice,
    ) => {
      const devices: Device[] = [];
      const storedDeviceInfo = isOutput ? outputDeviceInfo : inputDeviceInfo;

      // Add all devices from priority list (available or not)
      priorityList.forEach((deviceName, index) => {
        const availableDevice = availableDevices.find((d) => d.name.toLowerCase() === deviceName.toLowerCase());

        if (availableDevice) {
          // Device is currently available
          devices.push({
            ...availableDevice,
            priorityRank: index + 1,
            isAvailable: true,
            isCurrent: availableDevice.uid === currentDevice.uid,
          });
        } else {
          // Device is in priority list but not currently available - use stored transport type
          const storedInfo = storedDeviceInfo.find((info) => info.name.toLowerCase() === deviceName.toLowerCase());
          devices.push({
            id: "",
            uid: `unavailable-${deviceName}`,
            name: deviceName,
            transportType: storedInfo?.transportType || "Unknown",
            isInput: !isOutput,
            isOutput: isOutput,
            priorityRank: index + 1,
            isAvailable: false,
            isCurrent: false,
          });
        }
      });

      // All available devices should already be in the priority list at this point
      // Add any remaining available devices that might have been missed
      availableDevices.forEach((device) => {
        const alreadyIncluded = devices.some((d) => d.name.toLowerCase() === device.name.toLowerCase());
        if (!alreadyIncluded) {
          // Find the rank from the priority list
          const rankIndex = priorityList.findIndex((name) => name.toLowerCase() === device.name.toLowerCase());
          devices.push({
            ...device,
            priorityRank: rankIndex >= 0 ? rankIndex + 1 : priorityList.length + 1,
            isAvailable: true,
            isCurrent: device.uid === currentDevice.uid,
          });
        }
      });

      return devices;
    };

    // Add any new devices to priority lists before creating device lists
    const newOutputDevices = outputDevices.filter(
      (device) => !outputPriorityList.some((name) => name.toLowerCase() === device.name.toLowerCase()),
    );
    const newInputDevices = inputDevices.filter(
      (device) => !inputPriorityList.some((name) => name.toLowerCase() === device.name.toLowerCase()),
    );

    if (newOutputDevices.length > 0) {
      const updatedOutputPriorityList = [...outputPriorityList, ...newOutputDevices.map((d) => d.name)];
      outputPriorityList = updatedOutputPriorityList;
      await setOutputPriorityList(updatedOutputPriorityList);
    }

    if (newInputDevices.length > 0) {
      const updatedInputPriorityList = [...inputPriorityList, ...newInputDevices.map((d) => d.name)];
      inputPriorityList = updatedInputPriorityList;
      await setInputPriorityList(updatedInputPriorityList);
    }

    const processedOutputDevices = createFullDeviceList(outputDevices, outputPriorityList, true, currentOutputDevice);
    const processedInputDevices = createFullDeviceList(inputDevices, inputPriorityList, false, currentInputDevice);

    // Sort devices by priority rank (lower rank = higher priority)
    processedOutputDevices.sort((a, b) => a.priorityRank - b.priorityRank);
    processedInputDevices.sort((a, b) => a.priorityRank - b.priorityRank);

    return {
      outputDevices: processedOutputDevices,
      inputDevices: processedInputDevices,
      outputPriorityList,
      inputPriorityList,
      currentOutputDevice,
      currentInputDevice,
    };
  }, []);

  // Initialize local state when data loads
  useEffect(() => {
    if (deviceData) {
      setLocalOutputPriorityList(deviceData.outputPriorityList);
      setLocalInputPriorityList(deviceData.inputPriorityList);
    }
  }, [deviceData]);

  // Create processed device data using local priority lists
  const processedDeviceData = deviceData
    ? (() => {
        const createDeviceListWithLocalPriorities = (devices: Device[], priorityList: string[]) => {
          return devices
            .map((device) => ({
              ...device,
              priorityRank:
                priorityList.findIndex((name) => name.toLowerCase() === device.name.toLowerCase()) + 1 ||
                priorityList.length + 1,
            }))
            .sort((a, b) => a.priorityRank - b.priorityRank);
        };

        return {
          outputDevices: createDeviceListWithLocalPriorities(deviceData.outputDevices, localOutputPriorityList),
          inputDevices: createDeviceListWithLocalPriorities(deviceData.inputDevices, localInputPriorityList),
        };
      })()
    : null;

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!processedDeviceData) {
    return (
      <List>
        <List.EmptyView
          title="No Devices Found"
          description="No audio devices are currently available"
          icon={Icon.SpeakerOn}
        />
      </List>
    );
  }

  const autoSwitchIfTopPriority = async (device: Device, newRank = 1, deviceType: "output" | "input") => {
    if (preferences.enableAutoSwitch && device.isAvailable && newRank === 1) {
      try {
        if (deviceType === "output" && device.isOutput) {
          await setDefaultOutputDevice(device.id);
          if (preferences.systemOutput) {
            await setDefaultSystemDevice(device.id);
          }
          showToast({ style: Toast.Style.Success, title: `Auto-switched to output: ${device.name}` });
        } else if (deviceType === "input" && device.isInput) {
          await setDefaultInputDevice(device.id);
          showToast({ style: Toast.Style.Success, title: `Auto-switched to input: ${device.name}` });
        }
      } catch (error) {
        console.log("Auto-switch failed:", error);
      }
    }
  };

  const setAsTopPriority = async (device: Device, deviceType: "output" | "input") => {
    try {
      const currentList = deviceType === "output" ? localOutputPriorityList : localInputPriorityList;
      const newList = [device.name, ...currentList.filter((name) => name.toLowerCase() !== device.name.toLowerCase())];

      // Update local state immediately for instant visual feedback
      if (deviceType === "output") {
        setLocalOutputPriorityList(newList);
        await setOutputPriorityList(newList);
        showToast({ style: Toast.Style.Success, title: `Set ${device.name} as top priority output device` });
      } else {
        setLocalInputPriorityList(newList);
        await setInputPriorityList(newList);
        showToast({ style: Toast.Style.Success, title: `Set ${device.name} as top priority input device` });
      }

      // Auto-switch if enabled and device is available
      await autoSwitchIfTopPriority(device, 1, deviceType);
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to set priority" });
    }
  };

  const moveUp = async (device: Device, deviceType: "output" | "input") => {
    try {
      const currentList = deviceType === "output" ? localOutputPriorityList : localInputPriorityList;
      const currentIndex = currentList.findIndex((name) => name.toLowerCase() === device.name.toLowerCase());

      if (currentIndex > 0) {
        const newList = [...currentList];
        // Swap with the device above
        [newList[currentIndex], newList[currentIndex - 1]] = [newList[currentIndex - 1], newList[currentIndex]];

        // Update local state immediately for instant visual feedback
        if (deviceType === "output") {
          setLocalOutputPriorityList(newList);
          await setOutputPriorityList(newList);
        } else {
          setLocalInputPriorityList(newList);
          await setInputPriorityList(newList);
        }

        showToast({ style: Toast.Style.Success, title: `Moved ${device.name} up in priority` });

        // Auto-switch if device moved to #1 position
        if (currentIndex === 1) {
          // Was at position 2, now at position 1
          await autoSwitchIfTopPriority(device, 1, deviceType);
        }
      }
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to move device up" });
    }
  };

  const moveDown = async (device: Device, deviceType: "output" | "input") => {
    try {
      const currentList = deviceType === "output" ? localOutputPriorityList : localInputPriorityList;
      const currentIndex = currentList.findIndex((name) => name.toLowerCase() === device.name.toLowerCase());

      if (currentIndex < currentList.length - 1 && currentIndex !== -1) {
        const newList = [...currentList];
        // Swap with the device below
        [newList[currentIndex], newList[currentIndex + 1]] = [newList[currentIndex + 1], newList[currentIndex]];

        // Update local state immediately for instant visual feedback
        if (deviceType === "output") {
          setLocalOutputPriorityList(newList);
          await setOutputPriorityList(newList);
        } else {
          setLocalInputPriorityList(newList);
          await setInputPriorityList(newList);
        }

        showToast({ style: Toast.Style.Success, title: `Moved ${device.name} down in priority` });
      }
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to move device down" });
    }
  };

  const moveToBottom = async (device: Device, deviceType: "output" | "input") => {
    try {
      const currentList = deviceType === "output" ? localOutputPriorityList : localInputPriorityList;
      const newList = [...currentList.filter((name) => name.toLowerCase() !== device.name.toLowerCase()), device.name];

      // Update local state immediately for instant visual feedback
      if (deviceType === "output") {
        setLocalOutputPriorityList(newList);
        await setOutputPriorityList(newList);
        showToast({ style: Toast.Style.Success, title: `Moved ${device.name} to bottom of output priority list` });
      } else {
        setLocalInputPriorityList(newList);
        await setInputPriorityList(newList);
        showToast({ style: Toast.Style.Success, title: `Moved ${device.name} to bottom of input priority list` });
      }
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to move device" });
    }
  };

  const renderDeviceActions = (device: Device, deviceType: "output" | "input") => (
    <ActionPanel>
      <ActionPanel.Section title="Priority Actions">
        <Action
          title="Set as Top Priority"
          icon={Icon.ChevronUp}
          onAction={() => setAsTopPriority(device, deviceType)}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
        />
        {device.priorityRank > 1 && (
          <Action
            title="Move up in Priority"
            icon={Icon.ArrowUp}
            onAction={() => moveUp(device, deviceType)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
          />
        )}
        <Action
          title="Move Down in Priority"
          icon={Icon.ArrowDown}
          onAction={() => moveDown(device, deviceType)}
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
        />
        <Action
          title="Move to Bottom"
          icon={Icon.ChevronDown}
          onAction={() => moveToBottom(device, deviceType)}
          shortcut={{ modifiers: ["cmd"], key: "b" }}
        />
        {!device.isAvailable && (
          <Action
            title="Remove from Priority List"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              try {
                const currentList = deviceType === "output" ? localOutputPriorityList : localInputPriorityList;
                const newList = currentList.filter((name) => name.toLowerCase() !== device.name.toLowerCase());

                // Update local state immediately for instant visual feedback
                if (deviceType === "output") {
                  setLocalOutputPriorityList(newList);
                  await setOutputPriorityList(newList);
                } else {
                  setLocalInputPriorityList(newList);
                  await setInputPriorityList(newList);
                }

                showToast({
                  style: Toast.Style.Success,
                  title: `Removed ${device.name} from ${deviceType} priority list`,
                });
              } catch {
                showToast({ style: Toast.Style.Failure, title: "Failed to remove device" });
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy Actions">
        <Action.CopyToClipboard
          title="Copy Device Name"
          content={device.name}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.CopyToClipboard
          title="Copy Device ID"
          content={device.id}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
        />
        <Action.CopyToClipboard
          title="Copy Device UID"
          content={device.uid}
          shortcut={{ modifiers: ["cmd"], key: "u" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Info">
        <Action
          title="Show Device Details"
          icon={Icon.Info}
          onAction={() => {
            showToast({
              style: Toast.Style.Success,
              title: device.name,
              message: `Type: ${device.transportType}\nID: ${device.id}\nUID: ${device.uid}`,
            });
          }}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  const getDeviceIcon = (device: Device): Icon => {
    // Check if it's a Bluetooth device
    if (device.transportType === TransportType.Bluetooth || device.transportType === TransportType.BluetoothLowEnergy) {
      const name = device.name.toLowerCase();
      if (name.includes("airpods")) {
        return Icon.Airpods;
      }
      if (name.includes("headphone") || name.includes("headset")) {
        return Icon.Headphones;
      }
      return Icon.Bluetooth;
    }

    // Default icons based on device type (includes AirPlay, USB, HDMI, etc.)
    return device.isInput ? Icon.Microphone : Icon.Speaker;
  };

  return (
    <List searchBarPlaceholder="Search audio devices...">
      <List.Section title={`Output Devices (${processedDeviceData.outputDevices.length})`}>
        {processedDeviceData.outputDevices.map((device) => (
          <List.Item
            key={device.uid}
            title={device.name}
            subtitle={device.isAvailable ? device.transportType : `${device.transportType} (Disconnected)`}
            icon={{
              source: getDeviceIcon(device),
              tintColor: device.isCurrent ? Color.Green : Color.SecondaryText,
            }}
            accessories={[
              ...(device.isAvailable ? [{ text: device.id, tooltip: `Device ID: ${device.id}` }] : []),
              ...(!device.isAvailable ? [{ icon: Icon.WifiDisabled, tooltip: "Device disconnected" }] : []),
              ...(device.isCurrent ? [{ icon: Icon.Checkmark, tooltip: "Currently active device" }] : []),
              { text: `#${device.priorityRank}`, tooltip: `Priority rank ${device.priorityRank}` },
            ]}
            actions={renderDeviceActions(device, "output")}
          />
        ))}
      </List.Section>

      <List.Section title={`Input Devices (${processedDeviceData.inputDevices.length})`}>
        {processedDeviceData.inputDevices.map((device) => (
          <List.Item
            key={device.uid}
            title={device.name}
            subtitle={device.isAvailable ? device.transportType : `${device.transportType} (Disconnected)`}
            icon={{
              source: getDeviceIcon(device),
              tintColor: device.isCurrent ? Color.Green : Color.SecondaryText,
            }}
            accessories={[
              ...(device.isAvailable ? [{ text: device.id, tooltip: `Device ID: ${device.id}` }] : []),
              ...(!device.isAvailable ? [{ icon: Icon.WifiDisabled, tooltip: "Device disconnected" }] : []),
              ...(device.isCurrent ? [{ icon: Icon.Checkmark, tooltip: "Currently active device" }] : []),
              { text: `#${device.priorityRank}`, tooltip: `Priority rank ${device.priorityRank}` },
            ]}
            actions={renderDeviceActions(device, "input")}
          />
        ))}
      </List.Section>
    </List>
  );
}
