import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenAccessControl, "Opened Access Control", "Failed to Open Access Control");
}
