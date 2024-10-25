import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.ToggleAllowlist, "Toggle Allow List Success", "Failed to Toggle Allow List");
}
