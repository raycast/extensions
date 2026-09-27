import { Icon, launchCommand, LaunchType, MenuBarExtra, openExtensionPreferences, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { type Target, withSession } from "./lib/meross";
import { applyPower, canSwitch, canToggle, stateIcon, stateLabel } from "./lib/ui";

export default function Command() {
  const [isSwitching, setIsSwitching] = useState(false);
  const { data, isLoading, error, mutate, revalidate } = useCachedPromise(
    () => withSession((session) => session.targets()),
    [],
    { keepPreviousData: true },
  );

  const targets = data ?? [];
  const switchable = targets.filter(canSwitch);
  const onCount = switchable.filter((t) => t.on).length;

  async function setPower(target: Target, on: boolean) {
    setIsSwitching(true);
    try {
      await mutate(
        withSession((session) => session.setPower(target, on)),
        { optimisticUpdate: (current) => applyPower(current ?? [], target, on), shouldRevalidateAfter: false },
      );
    } catch (err) {
      await showFailureToast(err, { title: `Could not switch ${target.title}` });
    } finally {
      setIsSwitching(false);
    }
  }

  return (
    <MenuBarExtra
      icon={{ source: onCount > 0 ? Icon.Plug : Icon.Power }}
      title={onCount > 0 ? String(onCount) : undefined}
      tooltip={`Meross: ${onCount} of ${switchable.length} on`}
      isLoading={isLoading || isSwitching}
    >
      {error && !data && <MenuBarExtra.Item title={`Error: ${error.message}`} icon={Icon.Warning} />}
      <MenuBarExtra.Section title="Devices">
        {targets.map((target) =>
          canSwitch(target) && !canToggle(target) ? (
            // State unknown: toggling would guess, so offer explicit on/off instead.
            <MenuBarExtra.Submenu
              key={target.id}
              title={`${target.title} (${stateLabel(target)})`}
              icon={stateIcon(target)}
            >
              <MenuBarExtra.Item title="Turn on" icon={Icon.Power} onAction={() => setPower(target, true)} />
              <MenuBarExtra.Item title="Turn off" icon={Icon.CircleDisabled} onAction={() => setPower(target, false)} />
            </MenuBarExtra.Submenu>
          ) : (
            <MenuBarExtra.Item
              key={target.id}
              title={target.title}
              subtitle={stateLabel(target)}
              icon={stateIcon(target)}
              onAction={canToggle(target) ? () => setPower(target, !target.on) : undefined}
            />
          ),
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
        <MenuBarExtra.Item
          title="Open Devices"
          icon={Icon.List}
          onAction={() => launchCommand({ name: "devices", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Preferences…" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
