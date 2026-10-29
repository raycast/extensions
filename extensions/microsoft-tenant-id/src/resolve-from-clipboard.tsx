import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { lookupTenant, parseTokens, toCsv } from "./lib/tenant";

/** Prefer the current selection (works without copying), fall back to the clipboard. */
async function readInput(): Promise<string> {
  try {
    const selected = await getSelectedText();
    if (selected && selected.trim()) return selected;
  } catch {
    // No selection available (or unsupported) — fall back to the clipboard.
  }
  const clip = await Clipboard.readText();
  return clip ?? "";
}

export default async function Command() {
  try {
    const input = await readInput();
    const domains = parseTokens(input)
      .filter((t) => t.valid)
      .map((t) => t.domain);

    if (domains.length === 0) {
      await showHUD("❌ No domain found in selection or clipboard");
      return;
    }

    await showHUD(domains.length === 1 ? `🔎 Resolving ${domains[0]}…` : `🔎 Resolving ${domains.length} domains…`);

    const resolved = (await Promise.all(domains.map(lookupTenant))).filter((r) => r.tenantId);

    if (resolved.length === 0) {
      await showHUD("❌ No Microsoft tenant found");
      return;
    }

    if (resolved.length === 1) {
      const result = resolved[0];
      await Clipboard.copy(result.tenantId as string);
      await showHUD(`✅ Copied ${result.tenantId}${result.brandName ? ` · ${result.brandName}` : ""}`);
      return;
    }

    await Clipboard.copy(toCsv(resolved));
    await showHUD(`✅ Copied ${resolved.length} tenant IDs as CSV`);
  } catch (error) {
    await showFailureToast(error, { title: "Failed to resolve tenant ID" });
  }
}
