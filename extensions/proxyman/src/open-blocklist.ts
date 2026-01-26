import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenBlocklist, "Opened Blocklist", "Failed to Open Blocklist");
}
