import { MenuBarExtra, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { isSleepDisabled, refreshMenuBarCommand, refreshSleepStatusCommand, setSleepDisabled } from "./utils/sleep";

export default function MenuBar() {
  const [isVisible, setIsVisible] = useCachedState("menu-bar-visible", true);
  const [isDisabled, setIsDisabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    let cancelled = false;

    const updateStatus = async () => {
      try {
        const disabled = await isSleepDisabled();

        if (!cancelled) {
          setIsDisabled(disabled);
        }
      } catch {
        if (!cancelled) {
          setIsDisabled(null);
        }
      }
    };

    void updateStatus();
    const interval = setInterval(() => void updateStatus(), 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isVisible]);

  async function changeSleepState(disabled: boolean) {
    try {
      await setSleepDisabled(disabled);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not change sleep status",
      });
      return;
    }

    setIsDisabled(disabled);

    try {
      setIsDisabled(await isSleepDisabled());
    } catch {
      await showToast({
        title: "Sleep status changed",
        message: "Could not verify the current status",
      });
    }

    await refreshSleepStatusCommand().catch(() => undefined);
    await refreshMenuBarCommand().catch(() => undefined);
  }

  if (!isVisible) {
    return null;
  }

  const statusTitle = isDisabled === null ? "⚠ Status unavailable" : isDisabled ? "✓ Activated" : "✕ Deactivated";
  const menuBarIcon = isDisabled ? "extension-icon.png" : "extension-icon-deactivated.png";

  return (
    <MenuBarExtra icon={menuBarIcon} tooltip="SleepDeprived" isLoading={isDisabled === null}>
      <MenuBarExtra.Item title={statusTitle} />
      <MenuBarExtra.Item title="Activate" onAction={() => changeSleepState(true)} />
      <MenuBarExtra.Item title="Deactivate" onAction={() => changeSleepState(false)} />
      <MenuBarExtra.Item title="Remove Menu Bar Icon" onAction={() => setIsVisible(false)} />
    </MenuBarExtra>
  );
}
