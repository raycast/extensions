import { List, ActionPanel, Action, Toast, Icon, Color, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Monitor } from "../types";
import { Dispatch, SetStateAction, useRef } from "react";
import { setBrightness } from "../utils/set-brightness";

interface MonitorListItemProps {
  monitor: Monitor;
  setMonitors: Dispatch<SetStateAction<Monitor[]>>;
}

const showResToast = async (res: { ok: boolean; message: string }) => {
  if (!res.ok) {
    return showFailureToast(res, { title: res.message });
  }
  return showToast({
    style: res.ok ? Toast.Style.Success : Toast.Style.Failure,
    title: res.ok ? "Success" : "Failed",
    message: res.message,
  });
};

export function MonitorListItem({ monitor, setMonitors }: MonitorListItemProps) {
  const isUpdatingRef = useRef(false);

  const updateBrightness = async (newBrightness: number) => {
    if (isUpdatingRef.current) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Please wait",
        message: "Brightness is being updated...",
      });
      return;
    }

    isUpdatingRef.current = true;

    try {
      const res = await setBrightness(monitor.id, newBrightness);
      if (res.ok) {
        setMonitors((prev) => prev.map((m) => (m.id === monitor.id ? { ...m, brightness: newBrightness } : m)));
      }
      await showResToast(res);
    } finally {
      isUpdatingRef.current = false;
    }
  };

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
                const currentBrightness = monitor.brightness ?? 0;

                if (currentBrightness >= 1) {
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Max Brightness Reached",
                    message: "Brightness is already at maximum level.",
                  });
                  return;
                }

                const newBrightness = Math.min(currentBrightness + 0.1, 1.0);
                await updateBrightness(newBrightness);
              }}
            />
            <Action
              title="Decrease Brightness"
              onAction={async () => {
                const currentBrightness = monitor.brightness ?? 0;

                if (currentBrightness <= 0) {
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Min Brightness Reached",
                    message: "Brightness is already at minimum level.",
                  });
                  return;
                }

                const newBrightness = Math.max(currentBrightness - 0.1, 0.0);
                await updateBrightness(newBrightness);
              }}
            />
          </ActionPanel>
        )
      }
    />
  );
}
