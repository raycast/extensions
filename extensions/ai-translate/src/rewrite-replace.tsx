import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { addHistoryEntry } from "./history-store";
import {
  getMaxOutputTokens,
  getOrderedProviderIds,
  getProviderConfig,
  getTimeoutMs,
  readPreferences,
} from "./preferences";
import { MissingAPIKeyError } from "./providers";
import { runRewrite } from "./rewrite";

export default async function Command() {
  let source = "";
  try {
    source = (await getSelectedText()).replace(/\r\n/g, "\n").trim().slice(0, 12000);
  } catch {
    source = "";
  }

  if (!source) {
    await showHUD("No selected text — select text first, or grant Raycast Accessibility access in System Settings");
    return;
  }

  const preferences = readPreferences();
  const providerId = getOrderedProviderIds(preferences)[0];
  // Pro tier is intentional: Rewrite & Replace must produce consistent
  // English-rewrite quality regardless of the translation Model Tier the
  // user picked (see Rewrite & Coach for the same lock). If your provider
  // key only covers the fast tier, set the Custom tier model in
  // Extension Preferences to override.
  const config = getProviderConfig(providerId, preferences, "pro");

  try {
    await showHUD(`Rewriting with ${config.title}...`);
    const result = await runRewrite(
      config,
      source,
      "natural",
      getTimeoutMs(preferences),
      getMaxOutputTokens(preferences),
    );
    await Clipboard.paste(result.rewritten);
    await addHistoryEntry({
      kind: "rewrite",
      source,
      output: result.rewritten,
      provider: config.title,
      model: config.model,
    });
    await showHUD("Rewritten text pasted");
  } catch (error) {
    const message =
      error instanceof MissingAPIKeyError
        ? `${config.title}: add an API key in Extension Preferences`
        : error instanceof Error
          ? error.message
          : String(error);
    await showHUD(`Rewrite failed — ${message.slice(0, 100)}`);
  }
}
