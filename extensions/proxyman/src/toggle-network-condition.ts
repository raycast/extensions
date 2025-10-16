import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(
    ProxymanActions.ToggleNetworkCondition,
    "Toggle Network Condition Success",
    "Failed to Toggle Network Condition",
  );
}
