import { updateCommandMetadata } from "@raycast/api";
import { getErrorDetails, tailscale, getStatus } from "./shared";

export default async function Connect() {
  let subtitle: string;
  try {
    tailscale("up");

    const data = getStatus();
    const magicDNSSuffix = data.MagicDNSSuffix;

    subtitle = `Connected on ${magicDNSSuffix}`;
  } catch (err) {
    subtitle = getErrorDetails(err, "").title;
  }
  await updateCommandMetadata({ subtitle });
}
