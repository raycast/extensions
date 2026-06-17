import { Clipboard, showHUD } from "@raycast/api";
import { createSecretFlow } from "./lib/crypto-flows";
import { ApiError, ValidationError } from "./lib/errors";
import { getPrefs } from "./lib/preferences";

export default async function CreateFromClipboard() {
  try {
    const text = await Clipboard.readText();
    if (!text || text.trim().length === 0) {
      await showHUD("✗ Clipboard is empty");
      return;
    }

    const prefs = getPrefs();
    const result = await createSecretFlow({
      plaintext: text,
      host: prefs.host,
      views: prefs.defaultViews,
      expiry: prefs.defaultExpiry,
    });

    await Clipboard.copy(result.url);
    const viewsLabel =
      prefs.defaultViews === 0
        ? "unlimited views"
        : prefs.defaultViews === 1
          ? "1 view"
          : `${prefs.defaultViews} views`;
    await showHUD(
      `✓ Secret created — link copied (${viewsLabel} · ${prefs.defaultExpiry})`,
    );
  } catch (err) {
    const msg =
      err instanceof ApiError || err instanceof ValidationError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
    await showHUD(`✗ ${msg}`);
  }
}
