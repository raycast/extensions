import { MenuBarExtra, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { isSleepDisabled, refreshMenuBarCommand, refreshSleepStatusCommand, setSleepDisabled } from "./utils/sleep";

export default function MenuBar() {
  const [isVisible, setIsVisible] = useState(true);
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
    return () => {
      cancelled = true;
    };
  }, [isVisible]);

  async function changeSleepState(disabled: boolean) {
    try {
      await setSleepDisabled(disabled);
      setIsDisabled(await isSleepDisabled());
      await refreshSleepStatusCommand().catch(() => undefined);
      await refreshMenuBarCommand().catch(() => undefined);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not change sleep status",
      });
      return;
    }
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
