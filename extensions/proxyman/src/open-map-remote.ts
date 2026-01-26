import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenMapRemote, "Opened Map Remote", "Failed to Open Map Remote");
}
