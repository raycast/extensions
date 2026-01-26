import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenNetworkCondition, "Opened Network Condition", "Failed to Open Network Condition");
}
