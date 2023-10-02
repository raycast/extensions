import { MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { Shoot } from "./common";

export default function Command() {
  const { confettiSound } = getPreferenceValues();
  return (
    <MenuBarExtra isLoading={false} icon="🎉">
      <Shoot playSound={confettiSound} />
    </MenuBarExtra>
  );
}
