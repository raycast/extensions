import { updateCommandMetadata } from "@raycast/api";
import { isDoorstopperEnabled } from "./util";

export default async function Command() {
  const isEnabled = isDoorstopperEnabled();
  const subtitle = isEnabled ? "✔ Enabled" : "✖ Disabled";

  updateCommandMetadata({ subtitle });
}
