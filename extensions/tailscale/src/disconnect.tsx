import { updateCommandMetadata } from "@raycast/api";
import { getErrorDetails, tailscale } from "./shared";

export default async function Connect() {
  let subtitle: string;
  subtitle = "Tailscale";
  try {
    tailscale("down");
  } catch (err) {
    subtitle = getErrorDetails(err, "").title;
  }
  await updateCommandMetadata({ subtitle });
}
