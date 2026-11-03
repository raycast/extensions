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
  } catch (error) {
    await showFailureToast(error, { title: "Switch failed" });
    return;
  }
  // The switch already happened, so a failed lookup only loses the account name.
  const active = (await listAccounts(bin).catch(() => undefined))?.claude.find((a) => a.active);
  await showHUD(`Claude Code: ${active ? label(active) : "switched"}`);
}
