import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenAllowlist, "Opened Allowlist", "Failed to Open Allowlist");
}
