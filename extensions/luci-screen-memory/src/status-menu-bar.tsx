import { MenuBarExtra, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getLuciStatus, toggleLuciRecording, openLuciApp } from "./luci";

export default function Command() {
  const { data: status, isLoading, revalidate } = usePromise(getLuciStatus);

  const recordingStatus = status?.status ?? "unknown";
  const isRunning = status?.running ?? false;
  const description = status?.description ?? "";

  async function handleToggle() {
    const result = await toggleLuciRecording();
    if (!result.success) {
      await showHUD(`⚠️ ${result.error ?? "Failed to toggle Luci"}`);
    } else if (result.recording) {
      await showHUD("Luci Screen Memory: Recording 🔴");
    } else {
      await showHUD("Luci Screen Memory: Paused ⏸️");
    }
    await revalidate();
  }

  async function handleOpenLuci() {
    try {
      await openLuciApp();
    } catch {
      await showHUD("⚠️ Could not open Luci application");
    }
  }

  const icon = !isRunning
    ? "⚪"
    : recordingStatus === "recording"
      ? "🔴"
      : recordingStatus === "paused"
        ? "⏸️"
        : "❓";

  const tooltip = !isRunning
    ? "Luci: Offline"
    : recordingStatus === "recording"
      ? "Luci: Recording"
      : recordingStatus === "paused"
        ? "Luci: Paused"
        : `Luci: ${description}`;

  const toggleTitle =
    recordingStatus === "recording"
      ? "Pause Screen Memory"
      : recordingStatus === "paused"
        ? "Start Screen Memory"
        : "Toggle Screen Memory";

  const statusTitle = !isRunning
    ? "Status: Offline"
    : recordingStatus === "recording"
      ? "Status: Recording"
      : recordingStatus === "paused"
        ? "Status: Paused"
        : `Status: ${description}`;

  return (
    <MenuBarExtra icon={icon} tooltip={tooltip} isLoading={isLoading}>
      <MenuBarExtra.Item
        title={toggleTitle}
        onAction={isRunning ? handleToggle : undefined}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title={statusTitle} />
      <MenuBarExtra.Item title="Open Luci App" onAction={handleOpenLuci} />
    </MenuBarExtra>
  );
}
