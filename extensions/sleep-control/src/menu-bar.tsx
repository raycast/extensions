import { getPreferenceValues, Icon, launchCommand, LaunchType, MenuBarExtra, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { changeSleepState, readSleepState } from "./lib/power";
import { presentation, reportError } from "./lib/ui";

export default function SleepMenuBar() {
  const { data, error, isLoading, revalidate } = usePromise(readSleepState);
  const [busy, setBusy] = useState(false);
  const look = presentation(data, Boolean(error));
  const known = data !== undefined && !error;
  const { showLabel } = getPreferenceValues<Preferences.MenuBar>();

  async function toggle() {
    if (!known || busy) return;
    setBusy(true);
    try {
      await changeSleepState(!data.disabled);
      await revalidate();
      await showHUD(data.disabled ? "Sleep allowed" : "Keeping your Mac awake");
    } catch (failure) {
      await revalidate();
      await reportError(failure);
    } finally {
      setBusy(false);
    }
  }

  return (
    <MenuBarExtra
      icon={{ source: look.icon, tintColor: look.color }}
      title={showLabel && known ? (data.disabled ? "Awake" : "Sleep") : undefined}
      tooltip={`Sleep Control · ${look.label}`}
      isLoading={isLoading || busy}
    >
      <MenuBarExtra.Section title={isLoading && !data ? "Checking Sleep…" : look.label}>
        <MenuBarExtra.Item
          title={busy ? "Applying…" : look.action}
          icon={known && data.disabled ? Icon.Moon : Icon.Sun}
          onAction={known && !busy ? toggle : undefined}
        />
        <MenuBarExtra.Item
          title={
            !known
              ? "Refresh to check your Mac’s sleep setting"
              : data.disabled
                ? "Lid open or closed · battery or charger"
                : "Your Mac follows its normal sleep settings"
          }
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Sleep Control…"
          icon={Icon.AppWindow}
          onAction={() => launchCommand({ name: "controls", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title={
            !known
              ? "Manage Quick Switching…"
              : data.quickSwitchingInstalled
                ? "Quick Switching Set Up"
                : "Set Up Quick Switching…"
          }
          icon={Icon.Lock}
          onAction={() =>
            launchCommand({ name: "controls", type: LaunchType.UserInitiated, context: { permissions: true } })
          }
        />
        <MenuBarExtra.Item title="Refresh Status" icon={Icon.ArrowClockwise} onAction={revalidate} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
