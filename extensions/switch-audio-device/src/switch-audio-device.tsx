import { ActionPanel, List, Action, Icon, showToast, Toast, Cache } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { memo, useCallback } from "react";
import { createAudioProvider, getInstallInfo } from "./lib/audio-provider";
import { AudioDevice } from "./lib/types";

const provider = createAudioProvider();
const cache = new Cache();
const OUTPUT_CACHE_KEY = "audio-devices-output";
const INPUT_CACHE_KEY = "audio-devices-input";

interface DevicesData {
  output: AudioDevice[];
  input: AudioDevice[];
}

function getCachedDevices(): DevicesData | undefined {
  const cachedOutput = cache.get(OUTPUT_CACHE_KEY);
  const cachedInput = cache.get(INPUT_CACHE_KEY);
  if (cachedOutput && cachedInput) {
    try {
      return {
        output: JSON.parse(cachedOutput),
        input: JSON.parse(cachedInput),
      };
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function sortById(devices: AudioDevice[]): AudioDevice[] {
  return [...devices].sort((a, b) => a.id.localeCompare(b.id));
}

const cachedDevices = getCachedDevices();

const DeviceListItem = memo(function DeviceListItem({
  device,
  onSetDefault,
}: {
  device: AudioDevice;
  onSetDefault: (device: AudioDevice) => void;
}) {
  const icon = device.type === "output" ? Icon.Speaker : Icon.Microphone;
  return (
    <List.Item
      icon={icon}
      title={device.name}
      accessories={device.isDefault ? [{ icon: Icon.Checkmark, tooltip: "Current default" }] : []}
      actions={
        <ActionPanel>
          <Action title="Set as Default" icon={icon} onAction={() => onSetDefault(device)} />
          <Action.CopyToClipboard title="Copy Device Name" content={device.name} />
        </ActionPanel>
      }
    />
  );
});

export default function Command() {
  const {
    isLoading,
    data: devices,
    error,
    mutate,
    revalidate,
  } = useCachedPromise(
    async () => {
      console.info("Fetching audio devices");
      const [outputDevices, inputDevices] = await Promise.all([
        provider.listOutputDevices(),
        provider.listInputDevices(),
      ]);
      const sortedOutput = sortById(outputDevices);
      const sortedInput = sortById(inputDevices);
      cache.set(OUTPUT_CACHE_KEY, JSON.stringify(sortedOutput));
      cache.set(INPUT_CACHE_KEY, JSON.stringify(sortedInput));
      return { output: sortedOutput, input: sortedInput };
    },
    [],
    { initialData: cachedDevices },
  );

  const isMissingDependency =
    error?.message?.includes("not found") ||
    error?.message?.includes("not recognized") ||
    error?.message?.includes("ENOENT");

  if (error && isMissingDependency) {
    const installInfo = getInstallInfo();
    return (
      <List>
        <List.Item
          icon={Icon.Download}
          title={installInfo.title}
          subtitle="Required dependency not found"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="View Install Instructions" url={installInfo.url} />
              <Action.CopyToClipboard title="Copy Install Command" content={installInfo.copyCommand} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error) {
    return (
      <List>
        <List.Item
          icon={Icon.ExclamationMark}
          title="Error"
          subtitle={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const handleSetDefault = useCallback(
    async (device: AudioDevice) => {
      const isOutput = device.type === "output";
      const label = isOutput ? "Output" : "Input";
      console.log(`Setting default audio ${label.toLowerCase()}: ${device.name} (${device.id})`);
      try {
        await mutate(
          (async () => {
            if (isOutput) {
              await provider.setOutputDevice(device.id);
            } else {
              await provider.setInputDevice(device.id);
            }
            const [freshOutput, freshInput] = await Promise.all([
              provider.listOutputDevices(),
              provider.listInputDevices(),
            ]);
            const sortedOutput = sortById(freshOutput);
            const sortedInput = sortById(freshInput);
            const targetList = isOutput ? sortedOutput : sortedInput;
            const wasSet = targetList.find((d) => d.id === device.id)?.isDefault;
            if (!wasSet) throw new Error("Device was not set as default");
            console.log(`Successfully set default audio ${label.toLowerCase()}: ${device.name}`);
            await showToast({ style: Toast.Style.Success, title: `Audio ${label} Changed`, message: device.name });
            cache.set(OUTPUT_CACHE_KEY, JSON.stringify(sortedOutput));
            cache.set(INPUT_CACHE_KEY, JSON.stringify(sortedInput));
            return { output: sortedOutput, input: sortedInput };
          })(),
          {
            optimisticUpdate: (current) => {
              if (!current) return current;
              if (isOutput) {
                return {
                  output: current.output.map((d) => ({ ...d, isDefault: d.id === device.id })),
                  input: current.input,
                };
              } else {
                return {
                  output: current.output,
                  input: current.input.map((d) => ({ ...d, isDefault: d.id === device.id })),
                };
              }
            },
          },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`Failed to set default audio ${label.toLowerCase()}: ${device.name}`, err);
        await showToast({ style: Toast.Style.Failure, title: "Failed to switch device", message });
      }
    },
    [mutate],
  );

  const hasOutputDevices = devices?.output && devices.output.length > 0;
  const hasInputDevices = devices?.input && devices.input.length > 0;
  const isEmpty = !hasOutputDevices && !hasInputDevices;

  return (
    <List isLoading={isLoading && !devices}>
      {isEmpty ? (
        <List.EmptyView icon={Icon.Speaker} title="No Audio Devices Found" />
      ) : (
        <>
          {hasOutputDevices && (
            <List.Section title="Output Devices">
              {devices.output.map((device) => (
                <DeviceListItem key={device.id} device={device} onSetDefault={handleSetDefault} />
              ))}
            </List.Section>
          )}
          {hasInputDevices && (
            <List.Section title="Input Devices">
              {devices.input.map((device) => (
                <DeviceListItem key={device.id} device={device} onSetDefault={handleSetDefault} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
