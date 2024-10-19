import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(
    ProxymanActions.ToggleSystemProxy,
    "Toggle System Proxy Success",
    "Failed to Toggle System Proxy",
  );
}
