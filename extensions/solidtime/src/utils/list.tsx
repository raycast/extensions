import { Color, Icon, type List } from "@raycast/api";

export function tagBillable(): List.Item.Accessory {
  return {
    tag: {
      value: "",
      color: Color.Blue,
    },
    icon: Icon.Coins,
  };
}

export function tagArchived(archived: boolean): List.Item.Accessory {
  return {
    text: {
      value: archived ? "Archived" : "Active",
      color: archived ? Color.Orange : Color.Green,
    },
    icon: archived ? Icon.XMarkCircle : Icon.CheckCircle,
  };
}
