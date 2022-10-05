import { Icon, MenuBarExtra, open, getPreferenceValues } from "@raycast/api";

const preferences: any = getPreferenceValues();

export default function Command() {
  const { input } = getPreferenceValues();
    return (
      <MenuBarExtra title={input}>
      <MenuBarExtra.Item icon="✏️" title="Go To Prefrences To Edit Your Message" />
    </MenuBarExtra>
  );
}