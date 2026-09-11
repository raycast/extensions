import * as Types from "@ui/types";
import { Color, Icon, List } from "@raycast/api";

export function ItemAccessory(
  item: Types.DataTriggersView,
  showHost = false,
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  /* Severity */
  if (item.priority !== undefined) {
    const severity = Number(item.priority);
    const acc: List.Item.Accessory = {
      tag: { value: "", color: Color.PrimaryText },
      icon: Icon.Info,
      tooltip: "",
    };
    switch (severity) {
      case 0:
        acc.tag = { value: "", color: { light: "#97AAB3", dark: "#97AAB3" } };
        acc.icon = Icon.Info;
        acc.tooltip = "Not Classified";
        break;
      case 1:
        acc.tag = { value: "", color: { light: "#7499FF", dark: "#7499FF" } };
        acc.icon = Icon.Info;
        acc.tooltip = "Information";
        break;
      case 2:
        acc.tag = { value: "", color: { light: "#FFC859", dark: "#FFC859" } };
        acc.icon = Icon.Warning;
        acc.tooltip = "Warning";
        break;
      case 3:
        acc.tag = { value: "", color: { light: "#FFA059", dark: "#FFA059" } };
        acc.icon = Icon.Warning;
        acc.tooltip = "Average";
        break;
      case 4:
        acc.tag = {
          value: "",
          color: { light: "#E9765A", dark: "#E9765A" },
        };
        acc.icon = Icon.XMarkCircle;
        acc.tooltip = "High";
        break;
      case 5:
        acc.tag = { value: "", color: { light: "#E45959", dark: "#E45959" } };
        acc.icon = Icon.XMarkCircle;
        acc.tooltip = "Disaster";
        break;
      default:
        break;
    }
    accessories.push(acc);
  }

  /* Host */
  const host = item.hosts?.at(0);
  if (showHost && host)
    accessories.push({
      tag: { value: host.name, color: Color.PrimaryText },
      icon: Icon.HardDrive,
    });

  /* Status */
  if (item.status) {
    accessories.push({
      tag: {
        value: item.status === "0" ? "Enabled" : "Disabled",
        color: item.status === "0" ? Color.Green : Color.SecondaryText,
      },
      icon: item.status === "0" ? Icon.Checkmark : Icon.CircleDisabled,
    });
  }

  return accessories;
}
