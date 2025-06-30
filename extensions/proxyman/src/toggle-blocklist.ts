import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.ToggleBlocklist, "Toggle Block List Success", "Failed to Toggle Block List");
}
