import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenSOCKSProxy, "Opened SOCKS Proxy", "Failed to Open SOCKS Proxy");
}
