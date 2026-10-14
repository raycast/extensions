import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { failureMessage, listDevices, setDevice, setVolume, toggleMute } from "./audio";
import { AudioDevice, Flow } from "./types";

type Preferences = {
  closeOnSwitch: boolean;
};

function label(flow: Flow): string {
  return flow === "output" ? "Output" : "Input";
}

function deviceIcon(flow: Flow, device: AudioDevice): Icon {
  if (device.muted) return flow === "output" ? Icon.SpeakerOff : Icon.MicrophoneDisabled;
  return flow === "output" ? Icon.Speaker : Icon.Microphone;
}

export default function DeviceList({ flow }: { flow: Flow }) {
  const { closeOnSwitch } = getPreferenceValues<Preferences>();
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    setIsLoading(true);
    try {
      const next = await listDevices(flow);
      if (request.current !== id) return;
      setDevices(next);
      setError(undefined);
    } catch (caught) {
      if (request.current !== id) return;
      const message = failureMessage(caught);
      setError(message);
      await showToast({ style: Toast.Style.Failure, title: `Could not list ${flow} devices`, message });
    } finally {
      if (request.current === id) setIsLoading(false);
    }
  }, [flow]);

  useEffect(() => {
    void load();
  }, [load]);

  async function switchTo(device: AudioDevice, role: "playback" | "all" | "communications") {
    try {
      await setDevice(flow, device.id, role);
      const title =
        role === "communications"
          ? `Calls: ${device.name}`
          : role === "all"
            ? `Playback and calls: ${device.name}`
            : `${label(flow)}: ${device.name}`;
      if (closeOnSwitch && role !== "communications") {
        await closeMainWindow();
        await showHUD(title);
        return;
      }
      await showToast({ style: Toast.Style.Success, title });
      await load();
    } catch (caught) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not switch device",
        message: failureMessage(caught),
      });
    }
  }

  async function mute(device: AudioDevice) {
    try {
      const updated = await toggleMute(flow, device.id);
      await showToast({
        style: Toast.Style.Success,
        title: updated.muted ? `Muted ${device.name}` : `Unmuted ${device.name}`,
      });
      await load();
    } catch (caught) {
      await showToast({ style: Toast.Style.Failure, title: "Could not toggle mute", message: failureMessage(caught) });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Search ${flow} devices`}>
      {!isLoading && error && devices.length === 0 ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={`Could not read ${flow} devices`}
          description={error}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => void load()} />
            </ActionPanel>
          }
        />
      ) : (
        devices.map((device) => (
          <List.Item
            key={device.id}
            icon={deviceIcon(flow, device)}
            title={device.name}
            keywords={[device.isDefault ? "default" : "", device.isCommunications ? "communications" : ""].filter(
              Boolean,
            )}
            accessories={accessories(device)}
            actions={
              <ActionPanel>
                <Action
                  title={`Set as ${label(flow)}`}
                  icon={flow === "output" ? Icon.Speaker : Icon.Microphone}
                  onAction={() => void switchTo(device, "playback")}
                />
                <Action
                  title="Set for Playback and Calls"
                  icon={Icon.CheckCircle}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "return" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "return" },
                  }}
                  onAction={() => void switchTo(device, "all")}
                />
                <Action
                  title="Set as Calls Device"
                  icon={Icon.Phone}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "k" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "k" },
                  }}
                  onAction={() => void switchTo(device, "communications")}
                />
                {device.muted != null ? (
                  <Action
                    title={device.muted ? "Unmute" : "Mute"}
                    icon={device.muted ? Icon.SpeakerOn : Icon.SpeakerOff}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "m" },
                      Windows: { modifiers: ["ctrl"], key: "m" },
                    }}
                    onAction={() => void mute(device)}
                  />
                ) : null}
                {device.volume != null ? (
                  <Action.Push
                    title="Set Volume…"
                    icon={Icon.SpeakerUp}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "v" },
                      Windows: { modifiers: ["ctrl"], key: "v" },
                    }}
                    target={<VolumeForm flow={flow} device={device} onDone={() => void load()} />}
                  />
                ) : null}
                <Action.CopyToClipboard title="Copy Device Name" content={device.name} icon={Icon.Clipboard} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => void load()}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function accessories(device: AudioDevice): List.Item.Accessory[] {
  const items: List.Item.Accessory[] = [];
  if (device.volume != null) items.push({ text: `${device.volume}%`, tooltip: "Volume" });
  if (device.muted) items.push({ tag: { value: "Muted", color: Color.Red } });
  if (device.isDefault) items.push({ tag: { value: "Default", color: Color.Green } });
  if (device.isCommunications) items.push({ tag: { value: "Calls", color: Color.Blue } });
  return items;
}

function VolumeForm({ flow, device, onDone }: { flow: Flow; device: AudioDevice; onDone: () => void }) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Set Volume"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Volume"
            onSubmit={async (values: { volume: string }) => {
              const level = Number(values.volume);
              if (!Number.isInteger(level) || level < 0 || level > 100) {
                await showToast({ style: Toast.Style.Failure, title: "Enter a whole number from 0 to 100" });
                return;
              }
              try {
                await setVolume(flow, device.id, level);
                await showToast({ style: Toast.Style.Success, title: `${device.name} at ${level}%` });
                onDone();
                pop();
              } catch (caught) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not set volume",
                  message: failureMessage(caught),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Device" text={device.name} />
      <Form.TextField
        id="volume"
        title="Volume"
        placeholder="0-100"
        defaultValue={device.volume == null ? "" : String(device.volume)}
        info="Whole number from 0 to 100."
      />
    </Form>
  );
}
