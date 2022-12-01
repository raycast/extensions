import { Icon, MenuBarExtra } from "@raycast/api";
import { Focus, getFocus } from "./utils";

function getIcon(name?: Focus["icon"]) {
  switch (name) {
    case "task":
      return Icon.Checkmark;
    case "email":
      return Icon.AtSymbol;
    case "browser":
      return Icon.Globe;
    default:
      return undefined;
  }
}

export default function Command() {
  const focus = getFocus();
  const icon = getIcon(focus?.icon);

  return <MenuBarExtra icon={icon} title={focus.text} />;
}
