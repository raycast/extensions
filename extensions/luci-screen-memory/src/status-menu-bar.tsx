import { MenuBarExtra, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getLuciStatus, toggleLuciRecording } from "./luci";

export default function Command() {
  const { data: status, isLoading, revalidate } = usePromise(getLuciStatus);

  const isRecording = status?.recording ?? false;
  const isRunning = status?.running ?? false;

  async function handleToggle() {
    await toggleLuciRecording();
    await revalidate();
  }

  return (
    <MenuBarExtra
      icon={isRunning ? (isRecording ? "🔴" : "⏸️") : "⚪"}
      tooltip={
        isRunning
          ? isRecording
            ? "Luci: Recording"
            : "Luci: Paused"
          : "Luci: Not running"
      }
      isLoading={isLoading}
    >
      <MenuBarExtra.Item
        title={isRecording ? "Pause Screen Memory" : "Start Screen Memory"}
        onAction={isRunning ? handleToggle : undefined}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={
          isRunning
            ? isRecording
              ? "Status: Recording"
              : "Status: Paused"
            : "Status: Offline"
        }
      />
      <MenuBarExtra.Item
        title="Open Luci App"
        onAction={() => open("/Applications/Luci.app")}
      />
    </MenuBarExtra>
  );
}
