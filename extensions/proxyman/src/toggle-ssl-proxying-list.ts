import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(
    ProxymanActions.ToggleSSLProxyingList,
    "Toggle SSL Proxying List Success",
    "Failed to Toggle SSL Proxying List",
  );
}
