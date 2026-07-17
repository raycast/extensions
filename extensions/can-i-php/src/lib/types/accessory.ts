import { Color } from "@raycast/api";

export interface AccessoryText {
  value: string;
  color: Color;
}

export interface Accessory {
  text: AccessoryText;
}
