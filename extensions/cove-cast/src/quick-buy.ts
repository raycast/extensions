import { Clipboard, open, showHUD } from "@raycast/api";
import { encodeUsdAmount } from "./cove";
import { getConfig } from "./config";
import { detectChains, extractContractAddress, type TokenInfo } from "./detect";
import { buildCoveLink } from "./link";
import { resolveChains } from "./resolve";

/**
 * No-view command: read the clipboard, resolve the chain deterministically, and
 * fire the configured Quick Buy amount in one keystroke. Everything is reported
 * through a HUD.
 */
export default async function QuickBuy(): Promise<void> {
  const config = getConfig();

  const extracted = extractContractAddress(await Clipboard.readText());
  if (!extracted) {
    await showHUD("Cove: no contract address on the clipboard");
    return;
  }

  const immediate = config.defaultBuyAction === "g";
  if (immediate) {
    // Validate the amount before doing any network work.
    try {
      encodeUsdAmount(config.quickBuyAmount);
    } catch {
      await showHUD("Cove: set a valid Quick Buy Amount in preferences");
      return;
    }
  }

  let info: TokenInfo | null = null;
  try {
    info = await detectChains(extracted.ca);
  } catch {
    info = null;
  }

  const resolution = resolveChains(extracted, info);
  if (resolution.kind === "none") {
    await showHUD("Cove: no supported chain found for this token");
    return;
  }
  const chainId = resolution.chainId;

  try {
    const url = buildCoveLink({
      kind: config.defaultBuyAction,
      ca: extracted.ca,
      type: extracted.type,
      chainId,
      amount: immediate ? config.quickBuyAmount : undefined,
      target: "tg",
    });
    await open(url);
    const action = immediate
      ? `buying $${config.quickBuyAmount} ${chainId}`
      : `opening ${chainId} panel`;
    await showHUD(`Cove: ${action} → ${shortCa(extracted.ca)}`);
  } catch (error) {
    await showHUD(
      `Cove: ${error instanceof Error ? error.message : "couldn't build link"}`,
    );
  }
}

function shortCa(ca: string): string {
  return ca.length <= 12 ? ca : `${ca.slice(0, 6)}…${ca.slice(-4)}`;
}
