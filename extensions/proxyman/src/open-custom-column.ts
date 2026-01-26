import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenCustomColumn, "Opened Custom Column", "Failed to Open Custom Column");
}
