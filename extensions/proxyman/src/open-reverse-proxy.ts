import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenReverseProxy, "Opened Reverse Proxy", "Failed to Open Reverse Proxy");
}
