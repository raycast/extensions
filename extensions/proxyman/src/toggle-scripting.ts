import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.ToggleScripting, "Toggle Scripting Success", "Failed to Toggle Scripting");
}
