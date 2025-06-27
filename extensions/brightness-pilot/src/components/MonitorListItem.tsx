import { List, ActionPanel, Action, Toast, Icon, Color } from "@raycast/api";
import { showToast } from "@raycast/api";
import { Monitor } from "../types";
import { Dispatch, SetStateAction } from "react";
import { setBrightness } from "../utils/set-brightness";

interface MonitorListItemProps {
  monitor: Monitor;
  setMonitors: Dispatch<SetStateAction<Monitor[]>>;
}

const showResToast = async (res: { ok: boolean; message: string }) => {
  return await showToast({
    style: res.ok ? Toast.Style.Success : Toast.Style.Failure,
    title: res.ok ? "Success" : "Failed",
    message: res.message,
  });
};

export function MonitorListItem({ monitor, setMonitors }: MonitorListItemProps) {
  return (
    <List.Item
      title={monitor.name}
      subtitle={`#${monitor.id}`}
      accessories={
        monitor.isSupported
          ? [
              {
                icon: Icon.Sun,
                text: `Brightness: ${Math.abs(Math.round((monitor.brightness ?? 0) * 100))}%`,
              },
            ]
          : [
              {
                icon: { source: Icon.Warning, tintColor: Color.Red },
                text: {
                  value: "HDMI is not supported (yet 👀)...",
                  color: Color.Red,
                },
              },
            ]
      }
      actions={
        !monitor.isSupported ? null : (
          <ActionPanel>
            <Action
              title="Increase Brightness"
              onAction={async () => {
                let brightness = monitor.brightness ?? 0;

                if (brightness === 1) {
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Max Brightness Reached",
                    message: "Brightness is already at maximum level.",
                  });
                  return;
                }
                brightness = Math.min(brightness + 0.1, 1.0);

                const res = await setBrightness(monitor.id, brightness);
                if (res.ok) setMonitors((prev) => prev.map((m) => (m.id === monitor.id ? { ...m, brightness } : m)));

                await showResToast(res);
              }}
            />
            <Action
              title="Decrease Brightness"
              onAction={async () => {
                let brightness = monitor.brightness ?? 0;

                if (brightness === 0) {
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Min Brightness Reached",
                    message: "Brightness is already at minimum level.",
                  });
                  return;
                }
                brightness = Math.max(brightness - 0.1, 0.0);

                const res = await setBrightness(monitor.id, brightness);
                if (res.ok) setMonitors((prev) => prev.map((m) => (m.id === monitor.id ? { ...m, brightness } : m)));

                await showResToast(res);
              }}
            />
          </ActionPanel>
        )
      }
    />
  );
}
