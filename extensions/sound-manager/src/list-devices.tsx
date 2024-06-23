import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { execa, ExecaError } from "execa";
import { useEffect, useState } from "react";

interface Device {
  name: string;
  id: string;
  uid: string;
  type: string;
}

interface ParsedDevice {
  name: string;
  id: string;
  uid: string;
}

const SWITCH_AUDIO_SOURCE_PATH = "/opt/homebrew/bin/SwitchAudioSource";

export default function ListDevices() {
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<{ inputDevices: Device[]; outputDevices: Device[] }>({
    inputDevices: [],
    outputDevices: [],
  });

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const { stdout: outputDevices } = await execa(SWITCH_AUDIO_SOURCE_PATH, ["-a", "-t", "output", "-f", "json"]);
        const { stdout: inputDevices } = await execa(SWITCH_AUDIO_SOURCE_PATH, ["-a", "-t", "input", "-f", "json"]);

        const parseDevices = (data: string, type: string): Device[] => {
          const parsed: ParsedDevice[] = JSON.parse(`[${data.trim().replace(/\n/g, ",")}]`);
          return parsed.map((device) => ({
            name: device.name.trim(),
            id: device.id,
            uid: device.uid,
            type: type,
          }));
        };

        setDevices({
          outputDevices: parseDevices(outputDevices, "output"),
          inputDevices: parseDevices(inputDevices, "input"),
        });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Fetch Devices",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDevices();
  }, []);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  return (
    <List>
      <List.Section title="Input Devices">
        {devices.inputDevices.map((device) => (
          <List.Item
            key={device.id}
            title={device.name}
            actions={
              <ActionPanel>
                <Action title="Set as Input" onAction={() => setInputDevice(device)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Output Devices">
        {devices.outputDevices.map((device) => (
          <List.Item
            key={device.id}
            title={device.name}
            actions={
              <ActionPanel>
                <Action title="Set as Output" onAction={() => setOutputDevice(device)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

const setInputDevice = async (device: Device) => {
  try {
    console.log(`Executing: ${SWITCH_AUDIO_SOURCE_PATH} -t input -u ${device.uid}`);
    const { stdout, stderr } = await execa(SWITCH_AUDIO_SOURCE_PATH, ["-t", device.type, "-u", device.uid]);
    console.log("stdout:", stdout);
    console.log("stderr:", stderr);

    showToast({
      style: Toast.Style.Success,
      title: "Input Device Set",
      message: `Input device changed to UID: ${device.uid}`,
    });
  } catch (error) {
    handleError(error as ExecaError, "Set Input Device");
  }
};

const setOutputDevice = async (device: Device) => {
  try {
    console.log(`Executing: ${SWITCH_AUDIO_SOURCE_PATH} -t output -u ${device.uid}`);
    const { stdout, stderr } = await execa(SWITCH_AUDIO_SOURCE_PATH, ["-t", device.type, "-u", device.uid]);
    console.log("stdout:", stdout);
    console.log("stderr:", stderr);

    showToast({
      style: Toast.Style.Success,
      title: "Output Device Set",
      message: `Output device changed to UID: ${device.uid}`,
    });
  } catch (error) {
    handleError(error as ExecaError, "Set Output Device");
  }
};

const handleError = (error: ExecaError, context: string) => {
  const errorMsg = error.stderr || error.message || "Unknown error";
  showToast({
    style: Toast.Style.Failure,
    title: `Failed to ${context}`,
    message: `Error: ${errorMsg}`,
  });
  console.error(`Failed to ${context}:`, errorMsg);
};
