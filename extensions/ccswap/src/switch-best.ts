import { getPreferenceValues, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { label, listAccounts, resolveBinary, run, switchArgs } from "./ccswap";

export default async function Command() {
  const bin = resolveBinary(getPreferenceValues<Preferences>().ccswapPath || undefined);
  if (!bin) {
    await showFailureToast("Install it with `uv tool install ccswap`, or set its path in preferences.", {
      title: "ccswap not found",
    });
    return;
  }
  try {
    await run(bin, switchArgs("claude"));
    const active = (await listAccounts(bin)).claude.find((a) => a.active);
    await showHUD(`Claude Code: ${active ? label(active) : "switched"}`);
  } catch (error) {
    await showFailureToast(error, { title: "Switch failed" });
  }
}
