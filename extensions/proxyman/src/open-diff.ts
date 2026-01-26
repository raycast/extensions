import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenDiff, "Opened Diff", "Failed to Open Diff");
}
