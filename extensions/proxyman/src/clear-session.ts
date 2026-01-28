import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.ClearSession, "Clear Session Success", "Failed to Clear Session");
}
