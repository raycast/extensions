import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.ToggleSOCKSProxy, "Toggle SOCKS Proxy Success", "Failed to Toggle SOCKS Proxy");
}
