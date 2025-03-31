import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.ToggleBreakpoint, "Toggle Breakpoint Success", "Failed to Toggle Breakpoint");
}
