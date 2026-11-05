import { updateCommandMetadata } from "@raycast/api";
import { getStatus } from "./lib/session";
import { statusSubtitle } from "./lib/labels";

export default async function Command() {
  try {
    const status = await getStatus();
    await updateCommandMetadata({ subtitle: statusSubtitle(status, Date.now()) });
  } catch (error) {
    console.log("Failed to get status", error);
    await updateCommandMetadata({ subtitle: "✖ Disabled" });
  }
}
