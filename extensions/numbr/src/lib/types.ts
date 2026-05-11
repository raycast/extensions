import type { Icon, List } from "@raycast/api";

export type NumbrResult = {
  group: "number" | "storage";
  title: string;
  value: string;
  copyValue?: string;
  markdown?: string;
  icon?: Icon;
  accessories?: List.Item.Accessory[];
};
