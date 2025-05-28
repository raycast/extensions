import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(
    ProxymanActions.ToggleRecordTraffic,
    "Toggle Record Traffic Success",
    "Failed to Toggle Record Traffic",
  );
}
