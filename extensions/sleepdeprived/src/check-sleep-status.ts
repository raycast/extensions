import { updateCommandMetadata } from "@raycast/api";
import { isSleepDisabled } from "./utils/sleep";

export default async function Command() {
  try {
    const disabled = await isSleepDisabled();
    const subtitle = disabled ? "✓ Activated" : "✕ Deactivated";

    await updateCommandMetadata({ subtitle });
  } catch {
    await updateCommandMetadata({ subtitle: "⚠ Unavailable" });
  }
}
