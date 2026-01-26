import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenDNSSpoofing, "Opened DNS Spoofing", "Failed to Open DNS Spoofing");
}
