import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.ToggleMapRemote, "Toggle Map Remote Success", "Failed to Toggle Map Remote");
}
