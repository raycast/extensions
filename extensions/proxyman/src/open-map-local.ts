import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenMapLocal, "Opened Map Local", "Failed to Open Map Local");
}
