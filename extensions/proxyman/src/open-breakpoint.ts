import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenBreakpoint, "Opened Breakpoint", "Failed to Open Breakpoint");
}
