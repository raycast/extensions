import { Color } from "@raycast/api";
import { Connection } from "./connection";

export const connectionColor: Record<Connection["state"], Color> = {
  connecting: Color.Yellow,
  connected: Color.Green,
  failed: Color.Red,
};
