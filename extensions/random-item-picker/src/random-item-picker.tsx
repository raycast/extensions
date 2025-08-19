import { showHUD } from "@raycast/api";
import { getInitialValue } from "./fileWrite";

export default function Command() {
  const items = getInitialValue()?.split(",") ?? [];

  const item = items[Math.floor(Math.random() * items.length)];

  showHUD(item);
}
