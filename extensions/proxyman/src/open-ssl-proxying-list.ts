import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenSSLProxyingList, "Opened SSL Proxying List", "Failed to Open SSL Proxying List");
}
