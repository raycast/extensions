import { Color, Icon, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { getCapsLock, setCapsLock } from "swift:../swift/caps-lock";

export default function CapsLockMenuBar() {
  const { hideWhenOff } = getPreferenceValues<{ hideWhenOff?: boolean }>();
  const [state, setState] = useState<boolean>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCapsLock()
      .then(setState)
      .catch(() => setState(undefined))
      .finally(() => setIsLoading(false));
  }, []);

  if (!isLoading && hideWhenOff && state === false) return null;

  async function change(on: boolean) {
    setState(await setCapsLock(on));
  }

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{
        source: state ? Icon.ArrowUpCircleFilled : Icon.ArrowUpCircle,
        tintColor: state ? Color.Orange : undefined,
      }}
      tooltip={state === undefined ? "Caps Lock" : `Caps Lock is ${state ? "on" : "off"}`}
    >
      <MenuBarExtra.Item
        title={state === undefined ? "Caps Lock state unknown" : `Caps Lock is ${state ? "On" : "Off"}`}
      />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={state ? "Turn Caps Lock Off" : "Turn Caps Lock On"}
          icon={state ? Icon.ArrowUpCircle : Icon.ArrowUpCircleFilled}
          onAction={() => change(!state)}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
