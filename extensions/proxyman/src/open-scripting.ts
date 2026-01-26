import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenScripting, "Opened Scripting", "Failed to Open Scripting");
}
