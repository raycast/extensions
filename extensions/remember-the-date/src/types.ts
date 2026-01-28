import { Color, Icon } from "@raycast/api";

export interface Item {
  id: string;
  name: string;
  subtitle: string;
  date: string;
  icon: Icon;
  color: Color;
}

export interface ListItems {
  title: string;
  items: Item[];
}

export interface Preferences {
  showDate: boolean;
  showCountdownByDay: boolean;
}
