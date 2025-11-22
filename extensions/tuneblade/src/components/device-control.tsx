import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { Service } from "bonjour-service";
import { useTuneblade } from "../hooks/use-tuneblade";
import { useForm } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";

interface SetVolumeValues {
  volume: string;
}

function SetVolumeForm({ onSetVolume }: { onSetVolume: (volume: number) => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<SetVolumeValues>({
    onSubmit: async (values) => {
      onSetVolume(parseInt(values.volume, 10));
      pop();
    },
    validation: {
      volume: (value) => {
        if (!value) {
          return "Volume is required";
        }
        const num = parseInt(value, 10);
        if (isNaN(num)) {
          return "Volume must be a number";
        }
        if (num < 0 || num > 100) {
          return "Volume must be between 0 and 100";
        }
        return null;
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Volume" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Volume" placeholder="48" {...itemProps.volume} />
    </Form>
  );
}

const originalRefreshTimer = 1000;
export default function DeviceControl({ device }: { device: Service }) {
  const { devices, setVolume, setConnection: _setConnection, refresh } = useTuneblade({ service: device });

  const [refreshTimer, setRefreshTimer] = useState<number>(1000);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setConnection = useCallback(
    (id: string, status: "connected" | "disconnected") => {
      _setConnection(id, status);
      temporarilyChangeRefreshTimer(200, 5000);
    },
    [_setConnection],
  );

  // Function to temporarily change refresh timer
  const temporarilyChangeRefreshTimer = useCallback(
    (tempValue: number, duration: number) => {
      setRefreshTimer(tempValue);
      // Cancel any ongoing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setRefreshTimer(originalRefreshTimer);
        timeoutRef.current = null;
      }, duration);
    },
    [originalRefreshTimer],
  );

  // Every refreshTimer ms refresh
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, refreshTimer);
    return () => clearInterval(interval);
  }, [refresh, refreshTimer]);

  return (
    <List navigationTitle={`Managing ${device.name}`}>
      {devices?.map((device) => (
        <List.Item
          key={device.id}
          title={`${device.name} (${device.status}) V: ${device.volume}`}
          actions={
            <ActionPanel>
              {(device.status === "connected" || device.status === "standby" || device.status === "disconnecting") && (
                <Action
                  icon={Icon.Minus}
                  title={device.status === "disconnecting" ? "Disconnecting…" : "Disconnect"}
                  onAction={
                    device.status === "disconnecting" ? () => {} : () => setConnection(device.id, "disconnected")
                  }
                />
              )}
              {(device.status === "disconnected" || device.status === "connecting") && (
                <Action
                  icon={Icon.Plus}
                  title={device.status === "connecting" ? "Connecting…" : "Connect"}
                  onAction={device.status === "connecting" ? () => {} : () => setConnection(device.id, "connected")}
                />
              )}
              <Action.Push
                title="Set Volume"
                icon={Icon.SpeakerOn}
                shortcut={{ macOS: { modifiers: ["cmd"], key: "v" }, windows: { modifiers: ["cmd"], key: "v" } }}
                target={<SetVolumeForm onSetVolume={(volume) => setVolume(device.id, volume)} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
