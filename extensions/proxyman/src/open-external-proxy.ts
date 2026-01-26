import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenExternalProxy, "Opened External Proxy", "Failed to Open External Proxy");
}
