import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.ToggleMapLocal, "Toggle Map Local Success", "Failed to Toggle Map Local");
}
