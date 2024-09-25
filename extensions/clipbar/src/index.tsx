import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [firstInit, setFirstInit] = useCachedState("clipmenu-init", true);

  if (firstInit === true) {
    setFirstInit(false);
  } else {
    open("raycast://extensions/raycast/clipboard-history/clipboard-history")
  }

  return <MenuBarExtra icon={Icon.Clipboard}></MenuBarExtra>;
}
