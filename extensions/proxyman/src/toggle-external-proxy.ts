import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(
    ProxymanActions.ToggleExternalProxy,
    "Toggle External Proxy Success",
    "Failed to Toggle External Proxy",
  );
}
