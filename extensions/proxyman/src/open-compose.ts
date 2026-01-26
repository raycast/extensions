import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenCompose, "Opened Compose", "Failed to Open Compose");
}
