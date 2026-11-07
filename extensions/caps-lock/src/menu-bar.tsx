import { Color, Icon, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getCapsLock, setCapsLock } from "swift:../swift/caps-lock";

export default function CapsLockMenuBar() {
  const { hideWhenOff } = getPreferenceValues<Preferences.MenuBar>();
  const {
    data: state,
    isLoading,
    mutate,
  } = usePromise(getCapsLock, [], { failureToastOptions: { title: "Couldn't read Caps Lock" } });
  const [isChanging, setIsChanging] = useState(false);

  if (!isLoading && !isChanging && hideWhenOff && state === false) return null;

  async function change(on: boolean) {
    setIsChanging(true);
    try {
      await mutate(setCapsLock(on), { shouldRevalidateAfter: false });
    } finally {
      setIsChanging(false);
    }
  }

  return (
    <MenuBarExtra
      isLoading={isLoading || isChanging}
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
